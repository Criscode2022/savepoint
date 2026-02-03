import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

@Injectable()
export class NeonDataAuthInterceptor implements HttpInterceptor {
  private readonly authService = inject(AuthService);

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    // Only attach auth to Neon Data API calls
    if (!req.url.startsWith(environment.databaseUrl)) {
      return next.handle(req);
    }

    // Don't override if already set
    if (req.headers.has('Authorization')) {
      return next.handle(req);
    }

    return from(this.authService.getAccessToken()).pipe(
      switchMap((token) => {
        if (!token) {
          return next.handle(req);
        }

        return next.handle(
          req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`,
            },
          }),
        );
      }),
    );
  }
}
