import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import {
  PaymentMethod,
  PaymentStatus,
  UpcomingBill,
} from '../../../../core/models/financial.models';
import { BrCurrencyPipe } from '../../../../shared/pipes/br-currency.pipe';
import { Badge, BadgeVariant, Button, Card } from '../../../../shared/ui';

@Component({
  selector: 'gd-upcoming-bill-card',
  imports: [Badge, BrCurrencyPipe, Button, Card],
  templateUrl: './upcoming-bill-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingBillCard {
  readonly bill = input.required<UpcomingBill>();
  readonly canMarkAsPaid = input(false);
  readonly canCancel = input(false);
  readonly dueText = input.required<string>();
  readonly dueVariant = input<BadgeVariant>('neutral');

  readonly markAsPaidRequested = output<UpcomingBill>();
  readonly cancelRequested = output<UpcomingBill>();

  protected readonly hasActions = computed(() => this.canMarkAsPaid() || this.canCancel());

  private readonly dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

  protected markAsPaid(): void {
    this.markAsPaidRequested.emit(this.bill());
  }

  protected cancelBill(): void {
    this.cancelRequested.emit(this.bill());
  }


  protected formatDate(value: string | null | undefined): string {
    return value ? this.dateFormatter.format(new Date(value)) : 'Não informada';
  }

  protected statusLabel(status: PaymentStatus = this.bill().status): string {
    const labels: Record<string, string> = {
      PENDING: 'Pendente',
      PAID: 'Pago',
      OVERDUE: 'Vencido',
      CANCELED: 'Cancelado',
    };

    return labels[status] ?? status;
  }

  protected statusVariant(status: PaymentStatus = this.bill().status): BadgeVariant {
    const variants: Record<string, BadgeVariant> = {
      PENDING: 'warning',
      PAID: 'success',
      OVERDUE: 'danger',
      CANCELED: 'neutral',
    };

    return variants[status] ?? 'neutral';
  }

  protected paymentMethodLabel(method: PaymentMethod | null | undefined): string {
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
}
