import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BrCurrencyPipe } from '../../shared/pipes/br-currency.pipe';
import { Button, EmptyState, ErrorState, Skeleton, Badge } from '../../shared/ui';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { PendingFinancialTransaction, PendingFinancialTransactionStatus } from '../../core/models/pending-financial-transaction.models';
import { PendingFinancialTransactionService } from '../../core/services/pending-financial-transaction.service';
import { ToastStore } from '../../core/stores/toast.store';
import { PendingReviewDrawer } from './pending-review-drawer';
import { PendingFinancialTransactionCountService } from '../../core/services/pending-financial-transaction-count.service';

@Component({
  selector: 'gd-pending-transactions-page',
  imports: [Badge, BrCurrencyPipe, DecimalPipe, Button, EmptyState, ErrorState, Skeleton, PendingReviewDrawer],
  templateUrl: './pending-transactions-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingTransactionsPage {
  private readonly service = inject(PendingFinancialTransactionService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly access = inject(FarmAccessStore);
  private readonly toast = inject(ToastStore);
  private readonly pendingCount = inject(PendingFinancialTransactionCountService);
  protected readonly items = signal<PendingFinancialTransaction[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly selectedPendingId = signal<number | null>(null);
  protected readonly reviewOpen = signal(false);

  constructor() {
    effect(() => {
      const farmId = this.selectedFarmStore.selectedFarmId();
      if (farmId) this.load(farmId);
      else this.items.set([]);
    });
  }
  protected review(item: PendingFinancialTransaction): void {
    this.selectedPendingId.set(item.id);
    this.reviewOpen.set(true);
  }

  protected handleReviewed(value: PendingFinancialTransaction): void {
    this.items.update((items) => items.map((item) => item.id === value.id ? value : item));
    this.toast.success('Alterações salvas com sucesso.');
  }

  protected handleDecision(): void {
    this.reviewOpen.set(false);
    this.pendingCount.refresh();
    const farmId = this.selectedFarmStore.selectedFarmId();
    if (farmId) this.load(farmId);
  }

  protected label(status: PendingFinancialTransactionStatus): string { return { PENDING_REVIEW: 'Pendente de aprovação', APPROVED: 'Aprovada', REJECTED: 'Rejeitada', PROCESSING_ERROR: 'Erro de processamento' }[status]; }
  protected variant(status: PendingFinancialTransactionStatus): 'warning' | 'success' | 'danger' { return status === 'APPROVED' ? 'success' : status === 'PENDING_REVIEW' ? 'warning' : 'danger'; }
  private load(farmId: number): void { this.loading.set(true); this.error.set(false); this.service.list({ farmId, status: 'PENDING_REVIEW', size: 30 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: response => { this.items.set(response.content); this.loading.set(false); }, error: () => { this.error.set(true); this.loading.set(false); } }); }
}
