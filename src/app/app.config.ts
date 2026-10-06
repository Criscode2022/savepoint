import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from "@angular/common/http";
import { ApplicationConfig, provideExperimentalZonelessChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideIonicAngular } from "@ionic/angular/standalone";
import { routes } from "./app.routes";
import { authInterceptor } from "./shared/interceptors/auth.interceptor";
import { errorInterceptor } from "./shared/interceptors/error.interceptor";
import { NeonDataAuthInterceptor } from "./shared/interceptors/neon-data-auth.interceptor";
import { HTTP_INTERCEPTORS } from "@angular/common/http";

export const appConfig: ApplicationConfig = {
  providers: [
    // Signals drive rendering; zone.js is no longer loaded (see angular.json polyfills).
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor]),
      withInterceptorsFromDi()
    ),
    { provide: HTTP_INTERCEPTORS, useClass: NeonDataAuthInterceptor, multi: true },
    provideIonicAngular({
      mode: "md",
      animated: true,
      rippleEffect: true,
    }),
  ],
};
