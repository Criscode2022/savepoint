import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";
import { environment } from "../../../environments/environment";
import { AuthService } from "../../services/auth.service";

function isNeonRequest(url: string): boolean {
  const authBase = (environment.neonAuthUrl || "").replace(/\/+$/, "");
  const dataBase = (environment.databaseUrl || "").replace(/\/+$/, "");
  return (
    (!!authBase && url.startsWith(authBase)) ||
    (!!dataBase && url.startsWith(dataBase))
  );
}

/**
 * Attach Neon session credentials only to Neon Auth / Data API calls.
 * Third-party APIs (e.g. RAWG) must not receive the JWT, and their 401s
 * must not force a logout.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const neonRequest = isNeonRequest(req.url);

  // Ensure cookie-based Neon Auth session is sent/received.
  if (
    req.url.startsWith(environment.neonAuthUrl) &&
    !req.withCredentials
  ) {
    req = req.clone({ withCredentials: true });
  }

  // Only attach app JWT to our backend (never to RAWG / external hosts).
  if (neonRequest) {
    const token = authService.getToken();
    if (token && !req.headers.has("Authorization")) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && neonRequest) {
        authService.logout();
        void router.navigate(["/login"]);
      }
      return throwError(() => error);
    }),
  );
};
