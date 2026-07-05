import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { FinancialAlerts } from '../../../../core/models/financial.models';
import { BrCurrencyPipe } from '../../../../shared/pipes/br-currency.pipe';
import { Card, ErrorState, Skeleton } from '../../../../shared/ui';

@Component({
  selector: 'gd-important-alerts',
  imports: [BrCurrencyPipe, Card, ErrorState, LucideDynamicIcon, Skeleton],
  templateUrl: './important-alerts.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportantAlerts {
  readonly alerts = input<FinancialAlerts | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);

  protected readonly skeletonRows = [1, 2, 3];

  protected readonly hasOverdueBills = computed(
    () => (this.alerts()?.overdueBills.length ?? 0) > 0,
  );

  protected readonly shouldShowDueToday = computed(() => (this.alerts()?.dueToday.count ?? 0) > 0);

  protected readonly shouldShowDueNext7Days = computed(
    () => (this.alerts()?.dueNext7Days.count ?? 0) > 0,
  );

  protected readonly isEmpty = computed(
    () =>
      !this.hasOverdueBills() &&
      !this.shouldShowDueToday() &&
      !this.shouldShowDueNext7Days(),
  );

  protected overdueText(daysOverdue: number): string {
    return daysOverdue === 1 ? 'vencido há 1 dia' : `vencido há ${daysOverdue} dias`;
  }

  protected billsCountText(count: number): string {
    return count === 1 ? '1 conta' : `${count} contas`;
  }
}
