import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/** Lets signed-in users through; everyone else goes to /login. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready;
  return auth.isAuthenticated() || router.createUrlTree(['/login']);
};
