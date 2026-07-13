import { Routes } from '@angular/router';
import { AuthGuard } from './shared/guards/auth.guard';
import { loginGuard } from './shared/guards/login.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
    canActivate: [loginGuard],
    data: { authMode: 'login' },
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
    canActivate: [loginGuard],
    data: { authMode: 'register' },
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/app-shell/app-shell.component').then(
        (m) => m.AppShellComponent,
      ),
    canActivate: [AuthGuard],
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./pages/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'game/:id',
        loadComponent: () =>
          import('./pages/game-detail/game-detail.page').then(
            (m) => m.GameDetailPage,
          ),
      },
      {
        path: 'add',
        loadComponent: () =>
          import('./pages/game-form/game-form.page').then((m) => m.GameFormPage),
      },
      {
        path: 'wishlist/add',
        loadComponent: () =>
          import('./pages/game-form/game-form.page').then((m) => m.GameFormPage),
        data: { wishlist: true },
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./pages/game-form/game-form.page').then((m) => m.GameFormPage),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: 'play-history',
        loadComponent: () =>
          import('./pages/play-history/play-history.page').then(
            (m) => m.PlayHistoryPage,
          ),
      },
      {
        path: 'insights',
        loadComponent: () =>
          import('./pages/insights/insights.page').then((m) => m.InsightsPage),
      },
      {
        path: 'recommendations',
        loadComponent: () =>
          import('./pages/recommendations/recommendations.page').then(
            (m) => m.RecommendationsPage,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
