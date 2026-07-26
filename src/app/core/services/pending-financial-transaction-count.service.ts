import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { catchError, of } from 'rxjs';

import { FarmAccessStore } from '../stores/farm-access.store';
import { SelectedFarmStore } from '../stores/selected-farm.store';
import { SessionStore } from '../stores/session.store';
import { PendingFinancialTransactionService } from './pending-financial-transaction.service';

@Injectable({ providedIn: 'root' })
export class PendingFinancialTransactionCountService {
  private readonly service = inject(PendingFinancialTransactionService);
  private readonly selectedFarmStore = inject(SelectedFarmStore);
  private readonly farmAccessStore = inject(FarmAccessStore);
  private readonly sessionStore = inject(SessionStore);
  private readonly refreshVersion = signal(0);
  private readonly value = signal(0);

  readonly count = computed(() => this.value());

  constructor() {
    effect(() => {
      const farmId = this.selectedFarmStore.selectedFarmId();
      const canView = this.sessionStore.isAdmin() || this.farmAccessStore.canViewFinancial();
      this.refreshVersion();

      if (!farmId || !canView) {
        this.value.set(0);
        return;
      }

      this.service
        .list({ farmId, status: 'PENDING_REVIEW', size: 1 })
        .pipe(catchError(() => of(null)))
        .subscribe((response) => this.value.set(response?.totalElements ?? 0));
    });
  }

  refresh(): void {
    this.refreshVersion.update((value) => value + 1);
  }
}
