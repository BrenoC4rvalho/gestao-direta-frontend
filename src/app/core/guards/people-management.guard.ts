import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { FarmAccessStore } from '../stores/farm-access.store';
import { SelectedFarmStore } from '../stores/selected-farm.store';
import { SessionStore } from '../stores/session.store';

function hasPendingFarmAccess(): boolean {
  const farmAccessStore = inject(FarmAccessStore);

  return farmAccessStore.loading() || (!farmAccessStore.access() && !farmAccessStore.error());
}

function canManagePeople(): boolean {
  const farmAccessStore = inject(FarmAccessStore);
  const selectedFarmStore = inject(SelectedFarmStore);
  const sessionStore = inject(SessionStore);

  if (sessionStore.isAdmin()) {
    return true;
  }

  const farmId = selectedFarmStore.selectedFarmId();

  return (
    farmId !== null &&
    (hasPendingFarmAccess() ||
      (farmAccessStore.access()?.farmId === farmId && farmAccessStore.canManageFarmUsers()))
  );
}

export const peopleManagementGuard: CanActivateFn = (): boolean | UrlTree => {
  const router = inject(Router);

  return canManagePeople() ? true : router.createUrlTree(['/dashboard']);
};

export const peopleManagementDefaultRedirectGuard: CanActivateFn = (): UrlTree => {
  const router = inject(Router);
  const sessionStore = inject(SessionStore);

  if (!canManagePeople()) {
    return router.createUrlTree(['/dashboard']);
  }

  return router.createUrlTree([sessionStore.isAdmin() ? '/people/users' : '/people/farm-users']);
};
