import { Routes } from '@angular/router';
import { AuthGuard } from './shared/guards/auth.guard';
import { loginGuard } from './shared/guards/login.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
    canActivate: [loginGuard],
    data: { authMode: 'login' }
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
    canActivate: [loginGuard],
    data: { authMode: 'register' }
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
    path: 'wishlist/add',
    loadComponent: () => import('./pages/game-form/game-form.page').then(m => m.GameFormPage),
    canActivate: [AuthGuard],
    data: { wishlist: true }
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
    path: 'play-history',
    loadComponent: () => import('./pages/play-history/play-history.page').then(m => m.PlayHistoryPage),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];