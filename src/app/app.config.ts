import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from "@angular/common/http";
import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideIonicAngular } from "@ionic/angular/standalone";
import { routes } from "./app.routes";
import { authInterceptor } from "./shared/interceptors/auth.interceptor";
import { errorInterceptor } from "./shared/interceptors/error.interceptor";
import { NeonDataAuthInterceptor } from "./shared/interceptors/neon-data-auth.interceptor";
import { HTTP_INTERCEPTORS } from "@angular/common/http";
import { AuthService } from "./services/auth.service";

/**
 * Initialize authentication on app startup
 * This ensures the auth state is restored from cookies/localStorage
 * before any route guards run
 */
function initializeAuth(authService: AuthService) {
  return () => authService.initializeAuth();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor]),
      withInterceptorsFromDi()
    ),
    { provide: HTTP_INTERCEPTORS, useClass: NeonDataAuthInterceptor, multi: true },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true
    },
    provideIonicAngular({
      mode: "md",
      animated: true,
      rippleEffect: true,
    }),
  ],
};
