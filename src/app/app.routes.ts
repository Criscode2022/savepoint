import { Routes } from '@angular/router';
import { AuthGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'game/:id',
    loadComponent: () => import('./pages/game-detail/game-detail.page').then(m => m.GameDetailPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'add',
    loadComponent: () => import('./pages/game-form/game-form.page').then(m => m.GameFormPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./pages/game-form/game-form.page').then(m => m.GameFormPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];