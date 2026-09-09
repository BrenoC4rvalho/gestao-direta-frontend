import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

interface DashboardMetric {
  readonly label: string;
  readonly value: string;
  readonly icon: string;
  readonly tone: 'success' | 'danger' | 'primary';
}

@Component({
  selector: 'gd-dashboard-preview',
  imports: [LucideDynamicIcon],
  templateUrl: './dashboard-preview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPreview {
  protected readonly metrics: readonly DashboardMetric[] = [
    { label: 'Receitas', value: 'R$ 184.320', icon: 'trending-up', tone: 'success' },
    { label: 'Despesas', value: 'R$ 126.850', icon: 'trending-down', tone: 'danger' },
    { label: 'Resultado', value: 'R$ 57.470', icon: 'wallet', tone: 'primary' },
  ];

  protected metricTone(metric: DashboardMetric): string {
    return metric.tone === 'danger'
      ? 'bg-danger/10 text-danger'
      : metric.tone === 'success'
        ? 'bg-success/10 text-success'
        : 'bg-highlight-soft text-primary';
  }
}
