import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, filter, take } from 'rxjs';
import { map } from 'rxjs/operators';
import { authClient } from '../../lib/auth';
import { AuthUser, LoginCredentials, RegisterCredentials } from '../models/auth.model';

export type UserRole = 'admin' | 'user';

// LocalStorage key for iOS fallback session
const SESSION_STORAGE_KEY = 'neon_auth_session_fallback';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly router = inject(Router);

  private isAuthenticated = new BehaviorSubject<boolean>(false);
  private initialized = new BehaviorSubject<boolean>(false);
  private currentUser: AuthUser | null = null;
  private accessToken: string | null = null;

  constructor() {
    this.initializeAuth();
  }

  /**
   * Check if string is a valid JWT (has 3 parts)
   */
  private isJwt(token: string | null | undefined): token is string {
    if (!token) {
      return false;
    }
    return token.split('.').length === 3;
  }

  /**
   * Fetch JWT token from SDK using multiple fallback methods
   */
  private async fetchJwtFromSdk(): Promise<string | null> {
    try {
      const authWithJwt = authClient as unknown as {
        getJWTToken?: () => Promise<string | null>;
      };
      const jwt = await authWithJwt.getJWTToken?.();
      if (this.isJwt(jwt)) {
        return jwt;
      }
    } catch {
      // Ignore and fall back
    }

    try {
      const { data } = await authClient.getSession();
      const session = data?.session as unknown as
        | {
            token?: string;
            access_token?: string;
            accessToken?: string;
          }
        | undefined;

      const candidate =
        session?.token || session?.access_token || session?.accessToken || null;
      return this.isJwt(candidate) ? candidate : null;
    } catch {
      return null;
    }
  }

  /**
   * Initialize auth state on app start
   */
  private async initializeAuth(): Promise<void> {
    // Check for Neon Auth session via SDK (cookie-based)
    try {
      const { data } = await authClient.getSession();
      if (data?.session && data?.user) {
        this.accessToken = await this.fetchJwtFromSdk();

        this.currentUser = {
          id: data.user.id,
          email: data.user.email,
          username: data.user.name || data.user.email,
          avatarUrl: data.user.avatarUrl,
          accessToken: this.accessToken,
        };
        this.isAuthenticated.next(true);

        // Save to localStorage as iOS fallback
        this.saveToLocalStorage(this.currentUser);
        this.initialized.next(true);
        return;
      }
    } catch {
      // Cookie-based session failed, try localStorage fallback
    }

    // Fallback to localStorage (for iOS Safari where cookies may fail)
    this.restoreFromLocalStorage();
    this.initialized.next(true);
  }

  /**
   * Wait for initialization to complete (for guards)
   */
  waitForInitialization(): Observable<boolean> {
    return this.initialized.pipe(
      filter(initialized => initialized),
      take(1)
    );
  }

  /**
   * Save session to localStorage as fallback for iOS Safari
   */
  private saveToLocalStorage(user: AuthUser): void {
    try {
      const sessionData = {
        id: user.id,
        username: user.username,
        email: user.email,
        accessToken: this.accessToken,
        timestamp: Date.now(),
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    } catch {
      // localStorage not available
    }
  }

  /**
   * Restore session from localStorage (iOS Safari fallback)
   */
  private restoreFromLocalStorage(): boolean {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) {
        return false;
      }

      const sessionData = JSON.parse(stored) as {
        id: string;
        username: string;
        email?: string;
        accessToken?: string | null;
        timestamp: number;
      };

      // Check if session is not too old (7 days max)
      const maxAge = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - sessionData.timestamp > maxAge) {
        this.clearLocalStorage();
        return false;
      }

      this.currentUser = {
        id: sessionData.id,
        username: sessionData.username,
        email: sessionData.email || '',
        accessToken: null,
      };

      this.accessToken = this.isJwt(sessionData.accessToken)
        ? sessionData.accessToken
        : null;
      this.isAuthenticated.next(true);
      return true;
    } catch {
      this.clearLocalStorage();
      return false;
    }
  }

  /**
   * Clear localStorage session
   */
  private clearLocalStorage(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore errors
    }
  }

  /**
   * Set session after successful Neon Auth login
   */
  setNeonAuthSession(user: {
    id: string;
    name?: string;
    email: string;
    avatarUrl?: string;
    accessToken?: string | null;
  }): void {
    this.currentUser = {
      id: user.id,
      username: user.name || user.email,
      email: user.email,
      avatarUrl: user.avatarUrl,
      accessToken: null,
    };

    if (this.isJwt(user.accessToken)) {
      this.accessToken = user.accessToken;
      this.currentUser.accessToken = this.accessToken;
    }
    this.isAuthenticated.next(true);

    // Save to localStorage as fallback for iOS Safari
    this.saveToLocalStorage(this.currentUser);
  }

  /**
   * Login with email/password
   */
  async login(credentials: LoginCredentials): Promise<void> {
    const { data, error } = await authClient.signIn(credentials.email, credentials.password);

    if (error || !data?.session || !data?.user) {
      throw new Error(error?.message || 'Login failed');
    }

    // Get JWT token from session
    const token = await this.fetchJwtFromSdk();

    this.setNeonAuthSession({
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      avatarUrl: data.user.avatarUrl,
      accessToken: token,
    });
  }

  /**
   * Register with email/password
   */
  async register(credentials: RegisterCredentials): Promise<void> {
    const name = credentials.username || credentials.email.split('@')[0];
    const { data, error } = await authClient.signUp(credentials.email, credentials.password, name);

    if (error || !data?.session || !data?.user) {
      throw new Error(error?.message || 'Registration failed');
    }

    // Get JWT token from session
    const token = await this.fetchJwtFromSdk();

    this.setNeonAuthSession({
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      avatarUrl: data.user.avatarUrl,
      accessToken: token,
    });
  }

  /**
   * Verify session with Neon Auth
   */
  async verifySession(): Promise<boolean> {
    // If we already have a session in memory (just logged in), trust it
    // This fixes iOS Safari cookie issues where getSession() fails immediately after login
    if (this.currentUser && this.isAuthenticated.value) {
      return true;
    }

    try {
      const { data, error } = await authClient.getSession();
      if (error || !data?.session) {
        // Cookie-based session failed, try localStorage fallback (iOS)
        if (this.restoreFromLocalStorage()) {
          return true;
        }
        this.clearSession();
        return false;
      }

      this.accessToken = (await this.fetchJwtFromSdk()) || this.accessToken;

      // Update current user from session data
      if (data.user) {
        this.currentUser = {
          id: data.user.id,
          email: data.user.email,
          username: data.user.name || data.user.email,
          avatarUrl: data.user.avatarUrl,
          accessToken: this.accessToken,
        };
        this.isAuthenticated.next(true);
        // Also update localStorage in case it was stale
        this.saveToLocalStorage(this.currentUser);
      }

      return true;
    } catch {
      // Cookie-based session failed, try localStorage fallback (iOS)
      if (this.restoreFromLocalStorage()) {
        return true;
      }
      this.clearSession();
      return false;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await authClient.signOut();
    } catch {
      // Ignore errors during sign out
    }
    this.clearSession();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  /**
   * Clear session
   */
  private clearSession(): void {
    this.currentUser = null;
    this.accessToken = null;
    this.isAuthenticated.next(false);
    this.clearLocalStorage();
  }

  /**
   * Get access token for HTTP requests
   */
  async getAccessToken(): Promise<string | null> {
    if (this.isJwt(this.accessToken)) {
      return this.accessToken;
    }

    const jwt = await this.fetchJwtFromSdk();
    this.accessToken = jwt;
    return jwt;
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  /**
   * Get token (synchronous)
   */
  getToken(): string | null {
    return this.accessToken;
  }

  /**
   * Check if authenticated
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated.value;
  }

  /**
   * Get auth state observable
   */
  getAuthState(): Observable<boolean> {
    return this.isAuthenticated.asObservable();
  }

  /**
   * Get current user observable
   */
  getCurrentUser$(): Observable<AuthUser | null> {
    return this.isAuthenticated.pipe(
      map(() => this.currentUser)
    );
  }
}
