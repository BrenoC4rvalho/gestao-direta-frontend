import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import {
  HarvestPlanningComparison,
  HarvestPlanningComparisonMetric,
} from '../../../../core/models/harvest-season.models';
import { EmptyState, Tooltip } from '../../../../shared/ui';
import {
  PlanningComparisonCard,
  PlanningComparisonCardModel,
} from './planning-comparison-card/planning-comparison-card';

@Component({
  selector: 'gd-planning-current-comparison',
  imports: [EmptyState, LucideDynamicIcon, PlanningComparisonCard, Tooltip],
  templateUrl: './planning-current-comparison.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningCurrentComparison {
  readonly comparison = input.required<HarvestPlanningComparison>();
  readonly viewPlanning = output<void>();

  protected readonly projectionTooltip =
    'A projeção atual considera os valores realizados e os compromissos financeiros ainda em aberto.';
  protected readonly title = computed(() =>
    this.comparison().basis === 'REALIZED' ? 'Planejado x realizado' : 'Planejado x atual',
  );
  protected readonly currentLabel = computed(() =>
    this.comparison().basis === 'REALIZED' ? 'Realizado' : 'Projeção atual',
  );
  protected readonly cards = computed<readonly PlanningComparisonCardModel[]>(() => {
    const comparison = this.comparison();

    return [
      {
        title: 'Custo',
        projectedDescription: 'Os custos projetados',
        realizedDescription: 'Os custos realizados',
        icon: 'wallet',
        plannedColor: 'rgba(245, 158, 11, 0.30)',
        currentColor: '#F59E0B',
        explanationMode: 'PERCENTAGE',
        metric: comparison.cost,
      },
      {
        title: 'Receita',
        projectedDescription: 'A receita projetada',
        realizedDescription: 'A receita realizada',
        icon: 'trending-up',
        plannedColor: 'rgba(34, 197, 94, 0.28)',
        currentColor: '#16A34A',
        explanationMode: 'PERCENTAGE',
        metric: comparison.revenue,
      },
      {
        title: 'Resultado',
        projectedDescription: 'O resultado projetado',
        realizedDescription: 'O resultado realizado',
        icon: 'chart-no-axes-combined',
        plannedColor: 'rgba(37, 99, 235, 0.28)',
        currentColor: '#2563EB',
        explanationMode: 'AMOUNT',
        metric: comparison.profit,
      },
      {
        title: 'Margem',
        projectedDescription: 'A margem projetada',
        realizedDescription: 'A margem realizada',
        icon: 'badge-dollar-sign',
        plannedColor: 'rgba(124, 58, 237, 0.28)',
        currentColor: '#7C3AED',
        explanationMode: 'PERCENTAGE_POINTS',
        metric: comparison.margin,
      },
    ].filter(
      (
        card,
      ): card is Omit<PlanningComparisonCardModel, 'metric'> & {
        metric: HarvestPlanningComparisonMetric;
      } => card.metric !== null,
    );
  });

  protected showProjectionTooltip(): boolean {
    return this.comparison().basis === 'PROJECTED';
  }
}
