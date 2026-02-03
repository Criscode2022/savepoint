import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from, filter, take } from 'rxjs';
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
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Don't auto-initialize - let APP_INITIALIZER handle it
  }

  /**
   * Check if string is a valid JWT (has 3 parts)
   */
  private isJwt(token: string | null | undefined): token is string {
    if (!token) return false;
    return token.split('.').length === 3;
  }

  /**
   * Initialize auth state on app start
   * Returns a promise that resolves when initialization is complete
   */
  initializeAuth(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  /**
   * Internal initialization logic
   * Cookies are primary session storage, localStorage is fallback for iOS Safari
   */
  private async doInitialize(): Promise<void> {
    // Try cookie-based session first (primary)
    try {
      const { data, error } = await authClient.getSession();
      if (!error && data?.user) {
        // Cookie session valid
        this.accessToken = this.isJwt(data.token) ? data.token : null;

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
      // Cookie check failed, try localStorage fallback
    }

    // Cookie failed - try localStorage fallback (for iOS Safari)
    this.restoreFromLocalStorage();
    this.initialized.next(true);
  }

  /**
   * Check if initialization is complete
   */
  isInitialized(): boolean {
    return this.initialized.value;
  }

  /**
   * Wait for initialization to complete
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

      // Restore both the class property and user object
      this.accessToken = this.isJwt(sessionData.accessToken) ? sessionData.accessToken : null;
      this.currentUser = {
        id: sessionData.id,
        username: sessionData.username,
        email: sessionData.email || '',
        accessToken: this.accessToken,
      };
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
   * Login with email/password
   */
  async login(credentials: LoginCredentials): Promise<void> {
    const { data, error } = await authClient.signIn(credentials.email, credentials.password);
    
    if (error || !data?.user) {
      throw new Error(error?.message || 'Login failed');
    }

    this.accessToken = this.isJwt(data.token) ? data.token : null;
    this.currentUser = {
      id: data.user.id,
      email: data.user.email,
      username: data.user.name || data.user.email,
      avatarUrl: data.user.avatarUrl,
      accessToken: this.accessToken,
    };
    this.isAuthenticated.next(true);

    // Save to localStorage as fallback for iOS Safari
    this.saveToLocalStorage(this.currentUser);
  }

  /**
   * Register with email/password
   */
  async register(credentials: RegisterCredentials): Promise<void> {
    const name = credentials.username || credentials.email.split('@')[0];
    const { data, error } = await authClient.signUp(credentials.email, credentials.password, name);
    
    if (error || !data?.user) {
      throw new Error(error?.message || 'Registration failed');
    }

    this.accessToken = this.isJwt(data.token) ? data.token : null;
    this.currentUser = {
      id: data.user.id,
      email: data.user.email,
      username: data.user.name || data.user.email,
      avatarUrl: data.user.avatarUrl,
      accessToken: this.accessToken,
    };
    this.isAuthenticated.next(true);

    // Save to localStorage as fallback
    this.saveToLocalStorage(this.currentUser);
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
   * Verify session (for guards)
   * Checks memory first, then cookies, then localStorage (iOS fallback)
   */
  async verifySession(): Promise<boolean> {
    // If already authenticated in memory, trust it
    if (this.currentUser && this.isAuthenticated.value) {
      return true;
    }

    // Try cookie-based session first (primary)
    try {
      const { data, error } = await authClient.getSession();
      if (!error && data?.user) {
        this.accessToken = this.isJwt(data.token) ? data.token : null;
        this.currentUser = {
          id: data.user.id,
          email: data.user.email,
          username: data.user.name || data.user.email,
          avatarUrl: data.user.avatarUrl,
          accessToken: this.accessToken,
        };
        this.isAuthenticated.next(true);
        this.saveToLocalStorage(this.currentUser);
        return true;
      }
    } catch {
      // Cookie check failed
    }

    // Try localStorage fallback (for iOS Safari)
    if (this.restoreFromLocalStorage()) {
      return true;
    }

    this.clearSession();
    return false;
  }

  /**
   * Get access token for HTTP requests
   */
  async getAccessToken(): Promise<string | null> {
    if (this.isJwt(this.accessToken)) {
      return this.accessToken;
    }

    // Try to get fresh session
    const { data } = await authClient.getSession();
    const token = data?.token || null;
    this.accessToken = this.isJwt(token) ? token : null;
    return this.accessToken;
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
