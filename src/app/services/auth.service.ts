import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Router } from "@angular/router";
import { BehaviorSubject, Observable, throwError } from "rxjs";
import { catchError, map, tap } from "rxjs/operators";
import { environment } from "../../environments/environment";
import {
  AuthResponse,
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
} from "../models/auth.model";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly STORAGE_KEY = "gamevault_auth";
  private authState = new BehaviorSubject<AuthUser | null>(
    this.getStoredUser(),
  );

  currentUser$ = this.authState.asObservable();
  isAuthenticated$ = this.authState.pipe(map((user) => !!user));

  constructor() {
    // Check token expiration on init
    this.checkTokenExpiration();
  }

  private postAuth<T>(paths: string[], body: unknown): Observable<T> {
    const [first, ...rest] = paths;
    const baseUrl = (environment.neonAuthUrl || "").replace(/\/$/, "");
    const url = `${baseUrl}${first}`;

    return this.http.post<T>(url, body).pipe(
      catchError((error) => {
        if (rest.length > 0) {
          return this.postAuth<T>(rest, body);
        }
        return throwError(() => error);
      }),
    );
  }

  private getStoredUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  private storeUser(user: AuthUser): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
  }

  private clearStoredUser(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private checkTokenExpiration(): void {
    const user = this.getStoredUser();
    if (user && user.expiresAt && user.expiresAt < Date.now()) {
      this.logout();
    }
  }

  login(credentials: LoginCredentials): Observable<AuthUser> {
    return this.postAuth<AuthResponse>(
      ["/sign-in/email", "/login", "/signin"],
      credentials,
    ).pipe(
      tap((response) => {
        const user: AuthUser = {
          ...response.user,
          accessToken: response.token,
          refreshToken: response.refreshToken,
        };
        this.storeUser(user);
        this.authState.next(user);
      }),
      map((response) => ({
        ...response.user,
        accessToken: response.token,
        refreshToken: response.refreshToken,
      })),
      catchError((error) => {
        return throwError(
          () => new Error(error.error?.message || "Login failed"),
        );
      }),
    );
  }

  register(credentials: RegisterCredentials): Observable<AuthUser> {
    const payload = {
      email: credentials.email,
      password: credentials.password,
      name: credentials.username || credentials.email.split("@")[0],
    };

    return this.postAuth<AuthResponse>(
      ["/sign-up/email", "/register", "/signup"],
      payload,
    ).pipe(
      tap((response) => {
        const user: AuthUser = {
          ...response.user,
          accessToken: response.token,
          refreshToken: response.refreshToken,
        };
        this.storeUser(user);
        this.authState.next(user);
      }),
      map((response) => ({
        ...response.user,
        accessToken: response.token,
        refreshToken: response.refreshToken,
      })),
      catchError((error) => {
        return throwError(
          () => new Error(error.error?.message || "Registration failed"),
        );
      }),
    );
  }

  logout(): void {
    this.clearStoredUser();
    this.authState.next(null);
    this.router.navigate(["/login"]);
  }

  refreshToken(): Observable<string> {
    const user = this.getStoredUser();
    if (!user?.refreshToken) {
      return throwError(() => new Error("No refresh token available"));
    }

    return this.postAuth<{ token: string }>(["/refresh"], {
      refreshToken: user.refreshToken,
    }).pipe(
      tap((response) => {
        const updatedUser = { ...user, accessToken: response.token };
        this.storeUser(updatedUser);
        this.authState.next(updatedUser);
      }),
      map((response) => response.token),
      catchError((error) => {
        this.logout();
        return throwError(() => new Error("Session expired"));
      }),
    );
  }

  getCurrentUser(): AuthUser | null {
    return this.authState.value;
  }

  getToken(): string | null {
    return this.getCurrentUser()?.accessToken || null;
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }

  // Neon Auth integration
  async signInWithNeon(email: string, password: string): Promise<void> {
    // Neon Auth API integration
    const response = await fetch(`${environment.neonAuthUrl}/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error("Neon authentication failed");
    }

    const data = await response.json();
    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email,
      username: data.user.username,
      avatarUrl: data.user.avatarUrl,
      accessToken: data.token,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + data.expiresIn * 1000,
    };

    this.storeUser(user);
    this.authState.next(user);
  }
}
