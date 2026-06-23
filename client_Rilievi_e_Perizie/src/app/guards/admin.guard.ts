import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AdminAuthService } from '../services/admin-auth.service';
import { PerizieService } from '../services/perizie-service';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AdminAuthService);
  const perizieService = inject(PerizieService);

  if (auth.isAdminAuthenticated()) {
    return true;
  }

  const check$ = perizieService.getUtenti();
  if (!check$) {
    return router.createUrlTree(['/login']);
  }

  return check$.pipe(
    map(() => {
      auth.setAdminAuthenticated(true);
      return true;
    }),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};
