import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [IonApp, IonRouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  // Injected for its side effect: applies the stored theme on startup.
  private readonly themeService = inject(ThemeService);
}
