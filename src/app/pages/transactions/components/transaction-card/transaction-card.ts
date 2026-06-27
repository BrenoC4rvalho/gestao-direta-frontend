import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import {
  FinancialTransaction,
  PaymentMethod,
  PaymentStatus,
  TransactionType,
} from '../../../../core/models/financial-transaction.models';
import { Badge, BadgeVariant, Button, Card } from '../../../../shared/ui';

@Component({
  selector: 'gd-transaction-card',
  imports: [Badge, Button, Card],
  templateUrl: './transaction-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionCard {
  readonly transaction = input.required<FinancialTransaction>();
  readonly canEdit = input(false);
  readonly canMarkAsPaid = input(false);
  readonly canCancel = input(false);

  readonly editRequested = output<FinancialTransaction>();
  readonly markAsPaidRequested = output<FinancialTransaction>();
  readonly cancelRequested = output<FinancialTransaction>();

  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  private readonly dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

  protected editTransaction(): void {
    this.editRequested.emit(this.transaction());
  }

  protected markAsPaid(): void {
    this.markAsPaidRequested.emit(this.transaction());
  }

  protected cancelTransaction(): void {
    this.cancelRequested.emit(this.transaction());
  }

  protected formatCurrency(value: number): string {
    return this.currencyFormatter.format(value);
  }

  protected formatDate(value: string | null): string {
    return value ? this.dateFormatter.format(new Date(value)) : 'Não informada';
  }

  protected typeLabel(type: TransactionType = this.transaction().type): string {
    const labels: Record<string, string> = {
      INCOME: 'Receita',
      EXPENSE: 'Despesa',
    };

    return labels[type] ?? type;
  }

  protected typeVariant(): BadgeVariant {
    return this.transaction().type === 'INCOME' ? 'success' : 'danger';
  }

  protected statusLabel(status: PaymentStatus = this.transaction().status): string {
    const labels: Record<string, string> = {
      PENDING: 'Pendente',
      PAID: 'Paga',
      OVERDUE: 'Atrasada',
      CANCELED: 'Cancelada',
    };

    return labels[status] ?? status;
  }

  protected statusVariant(): BadgeVariant {
    const variants: Record<string, BadgeVariant> = {
      PENDING: 'warning',
      PAID: 'success',
      OVERDUE: 'danger',
      CANCELED: 'neutral',
    };

    return variants[this.transaction().status] ?? 'neutral';
  }

  protected paymentMethodLabel(method: PaymentMethod | null = this.transaction().paymentMethod): string {
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

  protected amountClasses(): string {
    return this.transaction().type === 'INCOME' ? 'text-success' : 'text-danger';
  }

  protected amountPrefix(): string {
    return this.transaction().type === 'INCOME' ? '+' : '-';
  }

  protected hasActions(): boolean {
    return this.canEdit() || this.canMarkAsPaid() || this.canCancel();
  }
}
