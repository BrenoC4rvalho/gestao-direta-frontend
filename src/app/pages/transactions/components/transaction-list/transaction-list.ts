import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import {
  FinancialTransaction,
  PaymentMethod,
  PaymentStatus,
  TransactionType,
} from '../../../../core/models/financial-transaction.models';
import { BrCurrencyPipe } from '../../../../shared/pipes/br-currency.pipe';
import {
  Badge,
  BadgeVariant,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
} from '../../../../shared/ui';
import { TransactionCard } from '../transaction-card/transaction-card';

export interface TransactionListPageInfo {
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
}

@Component({
  selector: 'gd-transaction-list',
  imports: [
    Badge,
    BrCurrencyPipe,
    Button,
    Card,
    EmptyState,
    ErrorState,
    LucideDynamicIcon,
    Skeleton,
    TransactionCard,
  ],
  templateUrl: './transaction-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionList {
  readonly transactions = input.required<readonly FinancialTransaction[]>();
  readonly page = input.required<number>();
  readonly pageInfo = input.required<TransactionListPageInfo>();
  readonly loading = input(false);
  readonly error = input(false);
  readonly emptyDescription = input.required<string>();
  readonly canManageTransactions = input(false);

  readonly retryRequested = output<void>();
  readonly previousPageRequested = output<void>();
  readonly nextPageRequested = output<void>();
  readonly editRequested = output<FinancialTransaction>();

  private readonly dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
  protected readonly skeletons = [1, 2, 3, 4, 5, 6];

  protected canEditTransaction(transaction: FinancialTransaction): boolean {
    return this.canManageTransactions() && transaction.status !== 'CANCELED';
  }

  protected formatDate(value: string | null): string {
    return value ? this.dateFormatter.format(new Date(value)) : 'Não informada';
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

  protected paymentMethodLabel(method: PaymentMethod | null): string {
    if (!method) {
      return 'Não informado';
    }

    const labels: Record<string, string> = {
      PIX: 'Pix',
      CASH: 'Dinheiro',
      CREDIT_CARD: 'Cartão de crédito',
      DEBIT_CARD: 'Cartão de débito',
      BANK_TRANSFER: 'Transferência bancária',
      BOLETO: 'Boleto',
      CHECK: 'Cheque',
      OTHER: 'Outro',
    };

    return labels[method] ?? method;
  }

  protected amountClasses(type: TransactionType): string {
    return type === 'INCOME' ? 'text-success' : 'text-danger';
  }

  protected amountPrefix(type: TransactionType): string {
    return type === 'INCOME' ? '+' : '-';
  }

  protected requestRetry(): void {
    this.retryRequested.emit();
  }

  protected requestPreviousPage(): void {
    this.previousPageRequested.emit();
  }

  protected requestNextPage(): void {
    this.nextPageRequested.emit();
  }

  protected requestEdit(transaction: FinancialTransaction): void {
    this.editRequested.emit(transaction);
  }
}
