import { Injectable, inject } from "@angular/core";
import { Router } from "@angular/router";
import { BehaviorSubject, Observable, filter, take } from "rxjs";
import { map } from "rxjs/operators";
import { authClient } from "../../lib/auth";
import {
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
} from "../models/auth.model";

export type UserRole = "admin" | "user";

// LocalStorage key for iOS fallback session
const SESSION_STORAGE_KEY = "neon_auth_session_fallback";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private readonly router = inject(Router);

  private isAuthenticated = new BehaviorSubject<boolean>(false);
  private initialized = new BehaviorSubject<boolean>(false);
  private currentUser: AuthUser | null = null;
  private accessToken: string | null = null;
  private handlingUnauthorized = false;

  private readonly jwtRegex =
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

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

    if (token.split(".").length !== 3) {
      return false;
    }

    // Avoid treating arbitrary dotted strings as JWTs
    return this.jwtRegex.test(token);
  }

  /**
   * Attempt to read a JWT out of document.cookie.
   *
   * Notes:
   * - If the auth cookie is HttpOnly, browsers won't expose it to JS and this will return null.
   * - Some setups store a JWT directly as a cookie value, others store a JSON blob.
   */
  private readJwtFromCookie(): string | null {
    if (typeof document === "undefined" || !document.cookie) {
      return null;
    }

    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const eqIndex = cookie.indexOf("=");
      if (eqIndex === -1) {
        continue;
      }

      const rawValue = cookie.slice(eqIndex + 1).trim();
      if (!rawValue) {
        continue;
      }

      // Cookie values may be URL encoded
      let value: string = rawValue;
      try {
        value = decodeURIComponent(rawValue);
      } catch {
        // ignore decode errors
      }

      if (this.isJwt(value)) {
        return value;
      }

      // Some providers store a JSON string in the cookie
      // NOTE: Angular's compiler plugin can sometimes mis-infer `value` as `never`
      // in this specific pattern, even though it's a `string`.
      // Using String.prototype.* avoids that inference issue.
      const maybeJson = value;
      if (
        typeof maybeJson === "string" &&
        String.prototype.startsWith.call(maybeJson, "{") &&
        String.prototype.endsWith.call(maybeJson, "}")
      ) {
        try {
          const parsed = JSON.parse(maybeJson) as Record<string, unknown>;
          const maybeToken =
            (parsed["token"] as string | undefined) ||
            (parsed["access_token"] as string | undefined) ||
            (parsed["accessToken"] as string | undefined) ||
            (parsed["jwt"] as string | undefined);

          if (this.isJwt(maybeToken)) {
            return maybeToken;
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    return null;
  }

  /**
   * Extract token from response data (handles multiple formats)
   */
  private extractToken(data: any): string | null {
    if (!data) return null;

    // Try session object first
    const session = data.session;
    if (session) {
      const sessionToken =
        session.token || session.access_token || session.accessToken;
      if (this.isJwt(sessionToken)) {
        return sessionToken;
      }
    }
    // Try root level token
    const rootToken = data.token || data.access_token || data.accessToken;
    if (this.isJwt(rootToken)) {
      return rootToken;
    }
    return null;
  }

  /**
   * Check if response has valid session (handles multiple formats)
   */
  private hasValidSession(data: any): boolean {
    if (!data) return false;
    // Check if we have user data (required)
    if (!data.user) return false;
    // Session can be explicit or implied by having user + cookie
    return true;
  }

  /**
   * Fetch JWT token from SDK using multiple fallback methods
   */
  private async fetchJwtFromSdk(): Promise<string | null> {
    const tokenResult = await authClient.getJWTToken();
    if (tokenResult.ok) {
      return this.isJwt(tokenResult.token) ? tokenResult.token : null;
    }

    if (tokenResult.unauthorized) {
      this.redirectToLogin();
      return null;
    }

    try {
      const { data } = await authClient.getSession();
      return this.extractToken(data);
    } catch {
      return null;
    }
  }

  /**
   * Clear session and redirect when auth is no longer valid
   */
  private redirectToLogin(): void {
    if (this.handlingUnauthorized) {
      return;
    }

    this.handlingUnauthorized = true;
    this.clearSession();

    void this.router
      .navigateByUrl("/login", { replaceUrl: true })
      .finally(() => {
        this.handlingUnauthorized = false;
      });
  }

  /**
   * Initialize auth state on app start
   */
  private async initializeAuth(): Promise<void> {
    // Check for Neon Auth session via SDK (cookie-based)
    try {
      const { data } = await authClient.getSession();
      if (this.hasValidSession(data)) {
        this.accessToken = this.extractToken(data);

        if (!this.isJwt(this.accessToken)) {
          const tokenResult = await authClient.getJWTToken();
          if (tokenResult.ok && this.isJwt(tokenResult.token)) {
            this.accessToken = tokenResult.token;
          } else if (!tokenResult.ok && tokenResult.unauthorized) {
            this.redirectToLogin();
            this.initialized.next(true);
            return;
          }
        }

        this.currentUser = {
          id: data!.user!.id,
          email: data!.user!.email,
          username: data!.user!.name || data!.user!.email,
          avatarUrl: data!.user!.avatarUrl,
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
    if (this.restoreFromLocalStorage()) {
      const tokenResult = await authClient.getJWTToken();
      if (tokenResult.ok && this.isJwt(tokenResult.token)) {
        this.accessToken = tokenResult.token;
        if (this.currentUser) {
          this.currentUser.accessToken = tokenResult.token;
        }
        this.initialized.next(true);
        return;
      }

      if (!tokenResult.ok && tokenResult.unauthorized) {
        this.redirectToLogin();
        this.initialized.next(true);
        return;
      }
    }

    this.initialized.next(true);
  }

  /**
   * Wait for initialization to complete (for guards)
   */
  public waitForInitialization(): Observable<boolean> {
    return this.initialized.pipe(
      filter((initialized) => initialized),
      take(1),
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
        email: sessionData.email || "",
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
  public setNeonAuthSession(user: {
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
  public async login(credentials: LoginCredentials): Promise<void> {
    const { data, error } = await authClient.signIn(
      credentials.email,
      credentials.password,
    );

    if (error || !data?.user) {
      throw new Error(error?.message || "Login failed");
    }

    // Get JWT token from response or SDK
    const token = this.extractToken(data) || (await this.fetchJwtFromSdk());

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
  public async register(credentials: RegisterCredentials): Promise<void> {
    const name = credentials.username || credentials.email.split("@")[0];
    const { data, error } = await authClient.signUp(
      credentials.email,
      credentials.password,
      name,
    );

    if (error || !data?.user) {
      throw new Error(error?.message || "Registration failed");
    }

    // Get JWT token from response or SDK
    const token = this.extractToken(data) || (await this.fetchJwtFromSdk());

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
  public async verifySession(): Promise<boolean> {
    // If we already have a session in memory (just logged in), trust it
    // This fixes iOS Safari cookie issues where getSession() fails immediately after login
    if (this.currentUser && this.isAuthenticated.value) {
      return true;
    }

    try {
      const { data, error } = await authClient.getSession();
      if (error || !this.hasValidSession(data)) {
        // Cookie-based session failed, try localStorage fallback (iOS)
        if (this.restoreFromLocalStorage()) {
          return true;
        }
        this.clearSession();
        return false;
      }

      this.accessToken =
        this.extractToken(data) ||
        (await this.fetchJwtFromSdk()) ||
        this.accessToken;

      // Update current user from session data
      this.currentUser = {
        id: data!.user!.id,
        email: data!.user!.email,
        username: data!.user!.name || data!.user!.email,
        avatarUrl: data!.user!.avatarUrl,
        accessToken: this.accessToken,
      };
      this.isAuthenticated.next(true);
      // Also update localStorage in case it was stale
      this.saveToLocalStorage(this.currentUser);

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
  public async logout(): Promise<void> {
    try {
      await authClient.signOut();
    } catch {
      // Ignore errors during sign out
    }
    this.clearSession();
    if (!this.handlingUnauthorized) {
      await this.router.navigateByUrl("/login", { replaceUrl: true });
    }
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
  public async getAccessToken(): Promise<string | null> {
    if (this.isJwt(this.accessToken)) {
      return this.accessToken;
    }

    // If a non-HttpOnly JWT cookie is present, use it.
    const cookieJwt = this.readJwtFromCookie();
    if (this.isJwt(cookieJwt)) {
      this.accessToken = cookieJwt;
      return cookieJwt;
    }

    const jwt = await this.fetchJwtFromSdk();
    if (jwt === null && !this.isAuthenticated.value) {
      return null;
    }

    this.accessToken = jwt;
    return jwt;
  }

  /**
   * Get current user
   */
  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  /**
   * Get token (synchronous)
   */
  public getToken(): string | null {
    if (this.isJwt(this.accessToken)) {
      return this.accessToken;
    }

    // Synchronous fallback when token only exists in a cookie-based session.
    const cookieJwt = this.readJwtFromCookie();
    if (this.isJwt(cookieJwt)) {
      this.accessToken = cookieJwt;
      return cookieJwt;
    }

    return null;
  }

  /**
   * Check if authenticated
   */
  public isLoggedIn(): boolean {
    return this.isAuthenticated.value;
  }

  /**
   * Get auth state observable
   */
  public getAuthState(): Observable<boolean> {
    return this.isAuthenticated.asObservable();
  }

  /**
   * Get current user observable
   */
  getCurrentUser$(): Observable<AuthUser | null> {
    return this.isAuthenticated.pipe(map(() => this.currentUser));
  }
}
