import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/shared/interceptors/auth.interceptor';
import { errorInterceptor } from './app/shared/interceptors/error.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor])
    ),
    importProvidersFrom(IonicModule.forRoot({
      mode: 'md',
      animated: true,
      rippleEffect: true,
    }))
  ]
}).catch(err => console.error(err));