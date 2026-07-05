import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';

import { SystemStatusService } from '../services/system-status.service';

export const apiAvailableGuard: CanActivateFn = ():
  | boolean
  | UrlTree
  | Observable<boolean | UrlTree> => {
  const router = inject(Router);
  const systemStatusService = inject(SystemStatusService);
  const serverErrorUrl = router.createUrlTree(['/server-error']);

  return systemStatusService.getStatus().pipe(
    map((status) => (systemStatusService.isHealthy(status) ? true : serverErrorUrl)),
    catchError(() => of(serverErrorUrl)),
  );
};
