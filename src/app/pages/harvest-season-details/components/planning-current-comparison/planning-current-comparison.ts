import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import {
  HarvestPlanningComparison,
  HarvestPlanningComparisonMetric,
  HarvestSeasonComparisonSemantic,
} from '../../../../core/models/harvest-season.models';
import { Card, EmptyState, Tooltip } from '../../../../shared/ui';

interface ComparisonCard {
  title: string;
  metric: HarvestPlanningComparisonMetric;
}

@Component({
  selector: 'gd-planning-current-comparison',
  imports: [Card, EmptyState, LucideDynamicIcon, Tooltip],
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
  protected readonly cards = computed<readonly ComparisonCard[]>(() => {
    const comparison = this.comparison();

    return [
      { title: 'Custo', metric: comparison.cost },
      { title: 'Receita', metric: comparison.revenue },
      { title: 'Resultado', metric: comparison.profit },
      { title: 'Margem', metric: comparison.margin },
    ].filter((card): card is ComparisonCard => card.metric !== null);
  });

  protected formatValue(metric: HarvestPlanningComparisonMetric, value: number): string {
    return metric.differenceUnit === 'PERCENTAGE_POINTS'
      ? this.formatPercentage(value)
      : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  protected formatDifference(metric: HarvestPlanningComparisonMetric): string {
    const sign = metric.difference > 0 ? '+' : '';
    const value =
      metric.differenceUnit === 'PERCENTAGE_POINTS'
        ? `${this.formatPercentage(metric.difference)} p.p.`
        : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            metric.difference,
          );

    return `${sign}${value}`;
  }

  protected percentageDifference(metric: HarvestPlanningComparisonMetric): string | null {
    if (metric.percentageDifference === null) {
      return null;
    }

    const sign = metric.percentageDifference > 0 ? '+' : '';
    return `${sign}${this.formatPercentage(metric.percentageDifference)}`;
  }

  protected positionLabel(metric: HarvestPlanningComparisonMetric): string {
    switch (metric.position) {
      case 'ABOVE_PLANNED':
        return 'Acima do planejado';
      case 'BELOW_PLANNED':
        return 'Abaixo do planejado';
      case 'ON_TARGET':
        return 'Conforme planejado';
    }
  }

  protected semanticClasses(semantic: HarvestSeasonComparisonSemantic): string {
    return semantic === 'BETTER'
      ? 'text-success'
      : semantic === 'WORSE'
        ? 'text-danger'
        : 'text-text-muted';
  }

  protected showProjectionTooltip(): boolean {
    return this.comparison().basis === 'PROJECTED';
  }

  private formatPercentage(value: number): string {
    return `${new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)}%`;
  }
}
