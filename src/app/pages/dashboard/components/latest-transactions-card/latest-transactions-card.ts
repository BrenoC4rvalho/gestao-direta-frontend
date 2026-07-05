import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  FinancialTransaction,
  PaymentStatus,
} from '../../../../core/models/financial.models';
import { BrCurrencyPipe } from '../../../../shared/pipes/br-currency.pipe';
import { Badge, BadgeVariant, Card, ErrorState, Skeleton } from '../../../../shared/ui';

@Component({
  selector: 'gd-latest-transactions-card',
  imports: [Badge, BrCurrencyPipe, Card, ErrorState, RouterLink, Skeleton],
  templateUrl: './latest-transactions-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LatestTransactionsCard {
  readonly transactions = input.required<readonly FinancialTransaction[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);

  protected readonly incomeTransactions = computed(() =>
    this.transactions()
      .filter((transaction) => transaction.type === 'INCOME')
      .slice(0, 5),
  );

  protected readonly expenseTransactions = computed(() =>
    this.transactions()
      .filter((transaction) => transaction.type === 'EXPENSE')
      .slice(0, 5),
  );

  protected readonly skeletonRows = [1, 2, 3];

  private readonly dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

  protected formatDate(value: string): string {
    return this.dateFormatter.format(new Date(value));
  }

  protected statusLabel(status: PaymentStatus): string {
    const labels: Record<string, string> = {
      PENDING: 'Pendente',
      PAID: 'Paga',
      OVERDUE: 'Atrasada',
      CANCELED: 'Cancelada',
    };

    return labels[status] ?? status;
  }

  protected statusVariant(status: PaymentStatus): BadgeVariant {
    const variants: Record<string, BadgeVariant> = {
      PENDING: 'warning',
      PAID: 'success',
      OVERDUE: 'danger',
      CANCELED: 'neutral',
    };

    return variants[status] ?? 'neutral';
  }

  protected valueClasses(type: FinancialTransaction['type']): string {
    return type === 'INCOME' ? 'text-success' : 'text-danger';
  }
}
