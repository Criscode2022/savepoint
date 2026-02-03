import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AuthUser, LoginCredentials, RegisterCredentials, AuthResponse } from '../models/auth.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly STORAGE_KEY = 'gamevault_auth';
  private authState = new BehaviorSubject<AuthUser | null>(this.getStoredUser());
  
  currentUser$ = this.authState.asObservable();
  isAuthenticated$ = this.authState.pipe(map(user => !!user));

  constructor() {
    // Check token expiration on init
    this.checkTokenExpiration();
  }

  private getStoredUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  private storeUser(user: AuthUser): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
  }

  private clearStoredUser(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private checkTokenExpiration(): void {
    const user = this.getStoredUser();
    if (user && user.expiresAt && user.expiresAt < Date.now()) {
      this.logout();
    }
  }

  login(credentials: LoginCredentials): Observable<AuthUser> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          const user: AuthUser = {
            ...response.user,
            accessToken: response.token,
            refreshToken: response.refreshToken
          };
          this.storeUser(user);
          this.authState.next(user);
        }),
        map(response => ({
          ...response.user,
          accessToken: response.token,
          refreshToken: response.refreshToken
        })),
        catchError(error => {
          return throwError(() => new Error(error.error?.message || 'Login failed'));
        })
      );
  }

  register(credentials: RegisterCredentials): Observable<AuthUser> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, credentials)
      .pipe(
        tap(response => {
          const user: AuthUser = {
            ...response.user,
            accessToken: response.token,
            refreshToken: response.refreshToken
          };
          this.storeUser(user);
          this.authState.next(user);
        }),
        map(response => ({
          ...response.user,
          accessToken: response.token,
          refreshToken: response.refreshToken
        })),
        catchError(error => {
          return throwError(() => new Error(error.error?.message || 'Registration failed'));
        })
      );
  }

  logout(): void {
    this.clearStoredUser();
    this.authState.next(null);
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<string> {
    const user = this.getStoredUser();
    if (!user?.refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<{ token: string }>(`${environment.apiUrl}/auth/refresh`, {
      refreshToken: user.refreshToken
    }).pipe(
      tap(response => {
        const updatedUser = { ...user, accessToken: response.token };
        this.storeUser(updatedUser);
        this.authState.next(updatedUser);
      }),
      map(response => response.token),
      catchError(error => {
        this.logout();
        return throwError(() => new Error('Session expired'));
      })
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
    const response = await fetch(`${environment.neonAuthUrl}/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error('Neon authentication failed');
    }

    const data = await response.json();
    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email,
      username: data.user.username,
      avatarUrl: data.user.avatarUrl,
      accessToken: data.token,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + (data.expiresIn * 1000)
    };

    this.storeUser(user);
    this.authState.next(user);
  }
}