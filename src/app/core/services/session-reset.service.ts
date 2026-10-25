import { inject, Injectable } from '@angular/core';

import { FarmAccessStore } from '../stores/farm-access.store';
import { SelectedFarmStore } from '../stores/selected-farm.store';
import { SessionStore } from '../stores/session.store';

@Injectable({
  providedIn: 'root',
})
export class SessionResetService {
  private readonly farmAccessStore = inject(FarmAccessStore);
  private readonly selectedFarmStore = inject(SelectedFarmStore);
  private readonly sessionStore = inject(SessionStore);

  clear(): void {
    this.sessionStore.clear();
    this.selectedFarmStore.clear();
    this.farmAccessStore.clear();
  }
}
