import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

export const neonDataAuthInterceptor: HttpInterceptorFn = (req, next) => {
  // Only attach auth to Neon Data API calls (HTTP REST endpoint)
  if (!req.url.startsWith(environment.databaseUrl)) {
    return next(req);
  }

  // Don't override if already set
  if (req.headers.has('Authorization')) {
    return next(req);
  }

  const authService = inject(AuthService);
  const token = authService.getToken();

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    })
  );
};
