import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";
import { environment } from "../../../environments/environment";
import { AuthService } from "../../services/auth.service";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Ensure cookie-based Neon Auth session is sent/received.
  if (req.url.startsWith(environment.neonAuthUrl) && !req.withCredentials) {
    req = req.clone({ withCredentials: true });
  }

  const token = authService.getToken();

  if (token && !req.headers.has("Authorization")) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.logout();
        router.navigate(["/login"]);
      }
      return throwError(() => error);
    }),
  );
};
