import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideIonicAngular } from "@ionic/angular/standalone";
import { routes } from "./app.routes";
import { authInterceptor } from "./shared/interceptors/auth.interceptor";
import { errorInterceptor } from "./shared/interceptors/error.interceptor";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideIonicAngular({
      mode: "md",
      animated: true,
      rippleEffect: true,
    }),
  ],
};
