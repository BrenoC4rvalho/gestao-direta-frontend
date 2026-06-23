import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  FinancialTransaction,
  PaymentStatus,
  TransactionType,
} from '../../../../core/models/financial.models';
import { Badge, BadgeVariant, Card, EmptyState, ErrorState, Skeleton } from '../../../../shared/ui';

@Component({
  selector: 'gd-latest-transactions-card',
  imports: [Badge, Card, EmptyState, ErrorState, RouterLink, Skeleton],
  templateUrl: './latest-transactions-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LatestTransactionsCard {
  readonly transactions = input.required<readonly FinancialTransaction[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);

  protected readonly skeletonRows = [1, 2, 3];

  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  private readonly dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

  protected formatCurrency(value: number): string {
    return this.currencyFormatter.format(value);
  }

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

  protected typeLabel(type: TransactionType): string {
    const labels: Record<string, string> = {
      INCOME: 'Entrada',
      EXPENSE: 'Saída',
    };

    return labels[type] ?? type;
  }

  protected typeClasses(type: TransactionType): string {
    return type === 'INCOME' ? 'text-success' : 'text-danger';
  }
}
