import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PaymentStatus, UpcomingBill } from '../../../../core/models/financial.models';
import { BrCurrencyPipe } from '../../../../shared/pipes/br-currency.pipe';
import { Badge, BadgeVariant, Card, EmptyState, ErrorState, Skeleton } from '../../../../shared/ui';

@Component({
  selector: 'gd-upcoming-bills-card',
  imports: [Badge, BrCurrencyPipe, Card, EmptyState, ErrorState, RouterLink, Skeleton],
  templateUrl: './upcoming-bills-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingBillsCard {
  readonly bills = input.required<readonly UpcomingBill[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);

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
}
