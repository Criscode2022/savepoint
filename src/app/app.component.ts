import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [CommonModule, IonApp, IonRouterOutlet]
})
export class AppComponent {
  private readonly themeService = inject(ThemeService);

  private readonly title = 'GameVault';
}