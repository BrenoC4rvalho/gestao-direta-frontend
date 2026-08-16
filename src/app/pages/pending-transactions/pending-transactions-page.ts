import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';

import { TransactionType } from '../../core/models/financial-transaction.models';
import { PendingFinancialTransaction } from '../../core/models/pending-financial-transaction.models';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { PendingFinancialTransactionsStore } from '../../core/stores/pending-financial-transactions.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { ToastStore } from '../../core/stores/toast.store';
import { ConfirmDialog } from '../../shared/overlays';
import { BrCurrencyPipe } from '../../shared/pipes/br-currency.pipe';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListFilters,
  ListFiltersConfig,
  ListFilterValues,
  Skeleton,
} from '../../shared/ui';
import { PendingReviewDrawer } from './pending-review-drawer';

@Component({
  selector: 'gd-pending-transactions-page',
  imports: [
    Badge,
    BrCurrencyPipe,
    Button,
    Card,
    DatePipe,
    DecimalPipe,
    EmptyState,
    ErrorState,
    ListFilters,
    Skeleton,
    PendingReviewDrawer,
  ],
  templateUrl: './pending-transactions-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingTransactionsPage implements OnDestroy {
  protected readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly access = inject(FarmAccessStore);
  protected readonly pendingTransactions = inject(PendingFinancialTransactionsStore);
  private readonly toast = inject(ToastStore);

  protected readonly selectedPendingId = signal<number | null>(null);
  protected readonly reviewOpen = signal(false);
  protected readonly filterConfig: ListFiltersConfig = {
    title: 'Filtrar pendências',
    subtitle: 'Encontre rapidamente movimentações por tipo.',
    selects: [
      {
        key: 'type',
        label: 'Tipo',
        options: [
          { label: 'Todos', value: null },
          { label: 'Receita', value: 'INCOME' },
          { label: 'Despesa', value: 'EXPENSE' },
        ],
      },
    ],
  };

  ngOnDestroy(): void {
    this.pendingTransactions.setTypeFilter(null);
  }

  protected review(item: PendingFinancialTransaction): void {
    this.selectedPendingId.set(item.id);
    this.reviewOpen.set(true);
  }

  protected applyFilters(values: ListFilterValues): void {
    const type = values['type'];
    this.pendingTransactions.setTypeFilter(
      type === 'INCOME' || type === 'EXPENSE' ? (type as TransactionType) : null,
    );
  }

  protected clearFilters(): void {
    this.pendingTransactions.setTypeFilter(null);
  }

  protected retry(): void {
    this.pendingTransactions.refresh();
  }

  protected handleReviewed(value: PendingFinancialTransaction): void {
    this.toast.success('Alterações salvas com sucesso.');
  }

  protected handleDecision(value: PendingFinancialTransaction): void {
    this.pendingTransactions.remove(value.id);
    this.reviewOpen.set(false);
    this.selectedPendingId.set(null);
  }

  protected missingFieldsLabel(item: PendingFinancialTransaction): string {
    const count = item.missingFields.length;

    return count === 1 ? '1 campo faltando' : `${count} campos faltando`;
  }

  protected missingFieldSummary(item: PendingFinancialTransaction): string {
    return item.missingFields.map((field) => this.missingFieldLabel(field)).join(', ');
  }

  protected missingFieldLabel(field: string): string {
    return (
      {
        type: 'Tipo',
        amount: 'Valor',
        description: 'Descrição',
        transactionDate: 'Data da movimentação',
        category: 'Categoria',
        categoryName: 'Categoria',
        paymentMethod: 'Método de pagamento',
      }[field] ?? field
    );
  }

  protected amountClasses(type: TransactionType): string {
    return type === 'INCOME' ? 'text-success' : 'text-danger';
  }
}
