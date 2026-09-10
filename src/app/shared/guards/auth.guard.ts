import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map, take, switchMap } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  public canActivate(): Observable<boolean | UrlTree> {
    // Wait for auth initialization to complete before checking state
    return this.authService.waitForInitialization().pipe(
      switchMap(() => this.authService.getAuthState()),
      take(1),
      map(isAuthenticated => {
        if (isAuthenticated) {
          return true;
        }
        return this.router.createUrlTree(['/login']);
      })
    );
  }
}