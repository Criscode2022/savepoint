import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, from } from "rxjs";
import { switchMap } from "rxjs/operators";
import { environment } from "../../../environments/environment";
import { AuthService } from "../../services/auth.service";

@Injectable()
export class NeonDataAuthInterceptor implements HttpInterceptor {
  private readonly authService = inject(AuthService);

  public intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    // For Neon Auth endpoints - let browser handle cookies automatically
    if (req.url.startsWith(environment.neonAuthUrl)) {
      // withCredentials allows cookies to be sent/received
      return next.handle(req.clone({ withCredentials: true }));
    }

    // For Neon Data API - attach JWT token
    if (!req.url.startsWith(environment.databaseUrl)) {
      return next.handle(req);
    }

    // Don't override if already set
    if (req.headers.has("Authorization")) {
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
