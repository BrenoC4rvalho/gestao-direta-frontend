import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { SessionStore } from '../stores/session.store';

export const authGuard: CanActivateFn = (): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const sessionStore = inject(SessionStore);

  if (sessionStore.isAuthenticated()) {
    return true;
  }

  if (sessionStore.initialized()) {
    return router.createUrlTree(['/login']);
  }

  sessionStore.setLoading(true);

  return authService.session().pipe(
    map((response) => {
      sessionStore.setUser(response.user);
      sessionStore.setInitialized(true);
      sessionStore.setLoading(false);
      return true;
    }),
    catchError(() => {
      sessionStore.clear();
      return of(router.createUrlTree(['/login']));
    }),
  );
};
