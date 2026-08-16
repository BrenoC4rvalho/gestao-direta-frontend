import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { catchError, exhaustMap, forkJoin, of, timer } from 'rxjs';

import { TransactionType } from '../models/financial-transaction.models';
import { PendingFinancialTransaction } from '../models/pending-financial-transaction.models';
import { PendingFinancialTransactionService } from '../services/pending-financial-transaction.service';
import { FarmAccessStore } from './farm-access.store';
import { SelectedFarmStore } from './selected-farm.store';
import { SessionStore } from './session.store';
import { ToastStore } from './toast.store';

const POLLING_INTERVAL_MS = 15_000;
const PAGE_SIZE = 30;

@Injectable({ providedIn: 'root' })
export class PendingFinancialTransactionsStore {
  private readonly service = inject(PendingFinancialTransactionService);
  private readonly selectedFarmStore = inject(SelectedFarmStore);
  private readonly farmAccessStore = inject(FarmAccessStore);
  private readonly sessionStore = inject(SessionStore);
  private readonly toastStore = inject(ToastStore);

  private readonly value = signal<readonly PendingFinancialTransaction[]>([]);
  private readonly pendingTotal = signal(0);
  private readonly initialLoading = signal(false);
  private readonly loadError = signal(false);
  private readonly updatedAt = signal<Date | null>(null);
  private readonly selectedType = signal<TransactionType | null>(null);
  private readonly refreshVersion = signal(0);
  private observedCount: number | null = null;

  readonly items = computed(() => this.value());
  readonly count = computed(() => this.pendingTotal());
  readonly loading = computed(() => this.initialLoading());
  readonly error = computed(() => this.loadError());
  readonly lastUpdated = computed(() => this.updatedAt());
  readonly typeFilter = computed(() => this.selectedType());

  constructor() {
    effect((onCleanup) => {
      const farmId = this.selectedFarmStore.selectedFarmId();
      const canView = this.sessionStore.isAdmin() || this.farmAccessStore.canViewFinancial();
      const type = this.selectedType();
      this.refreshVersion();

      if (!farmId || !canView) {
        this.reset();
        return;
      }

      if (this.updatedAt() === null) {
        this.initialLoading.set(true);
      }

      const subscription = timer(0, POLLING_INTERVAL_MS)
        .pipe(exhaustMap(() => this.load(farmId, type)))
        .subscribe((response) => this.applyResponse(response));

      onCleanup(() => subscription.unsubscribe());
    });
  }

  setTypeFilter(type: TransactionType | null): void {
    if (this.selectedType() !== type) {
      this.selectedType.set(type);
    }
  }

  refresh(): void {
    this.refreshVersion.update((version) => version + 1);
  }

  remove(id: number): void {
    this.value.update((items) => items.filter((item) => item.id !== id));
    this.pendingTotal.update((count) => Math.max(0, count - 1));
    this.observedCount = this.pendingTotal();
  }

  private load(farmId: number, type: TransactionType | null) {
    const baseParams = {
      farmId,
      status: 'PENDING_REVIEW' as const,
      page: 0,
      sort: 'createdAt',
      direction: 'DESC' as const,
    };
    const list = this.service.list({ ...baseParams, type: type ?? undefined, size: PAGE_SIZE });
    const count = type ? this.service.list({ ...baseParams, size: 1 }) : list;

    return forkJoin({ list, count }).pipe(
      catchError(() => {
        this.handleLoadError();
        return of(null);
      }),
    );
  }

  private applyResponse(
    response: {
      list: { content: PendingFinancialTransaction[]; totalElements: number };
      count: { totalElements: number };
    } | null,
  ): void {
    if (!response) {
      return;
    }

    const nextCount = response.count.totalElements;
    const previousCount = this.observedCount;
    this.value.set(response.list.content);
    this.pendingTotal.set(nextCount);
    this.initialLoading.set(false);
    this.loadError.set(false);
    this.updatedAt.set(new Date());
    this.observedCount = nextCount;

    if (previousCount !== null && nextCount > previousCount) {
      const received = nextCount - previousCount;
      this.toastStore.info(
        received === 1
          ? 'Nova movimentação pendente recebida.'
          : `${received} novas movimentações pendentes recebidas.`,
      );
    }
  }

  private handleLoadError(): void {
    this.initialLoading.set(false);

    if (this.value().length === 0 && this.updatedAt() === null) {
      this.loadError.set(true);
    }
  }

  private reset(): void {
    this.value.set([]);
    this.pendingTotal.set(0);
    this.initialLoading.set(false);
    this.loadError.set(false);
    this.updatedAt.set(null);
    this.observedCount = null;
  }
}
