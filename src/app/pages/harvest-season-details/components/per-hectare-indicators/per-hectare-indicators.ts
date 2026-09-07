import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import {
  HarvestSeasonDetailSummary,
  HarvestSeasonStatus,
} from '../../../../core/models/harvest-season.models';
import { BrCurrencyPipe } from '../../../../shared/pipes/br-currency.pipe';
import { EmptyState, SummaryCard, SummaryCardTone, Tooltip } from '../../../../shared/ui';

interface PerHectareIndicator {
  title: string;
  value: number;
  icon: string;
  tone: SummaryCardTone;
}

@Component({
  selector: 'gd-per-hectare-indicators',
  imports: [BrCurrencyPipe, EmptyState, SummaryCard, Tooltip],
  templateUrl: './per-hectare-indicators.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerHectareIndicators {
  readonly status = input.required<HarvestSeasonStatus>();
  readonly summary = input.required<HarvestSeasonDetailSummary>();

  protected readonly tooltip =
    'Indicadores financeiros calculados com base na área total da Safra.';
  protected readonly indicators = computed<readonly PerHectareIndicator[]>(() => {
    const summary = this.summary();

    switch (this.status()) {
      case 'PLANNED':
        return this.indicatorsFor(
          ['Custo planejado/ha', summary.plannedCostPerHectare, 'briefcase-business', 'warning'],
          ['Receita planejada/ha', summary.plannedRevenuePerHectare, 'trending-up', 'success'],
          ['Resultado planejado/ha', summary.plannedResultPerHectare, 'chart-no-axes-combined'],
        );
      case 'IN_PROGRESS':
        return this.indicatorsFor(
          ['Custo projetado/ha', summary.projectedCostPerHectare, 'briefcase-business', 'warning'],
          ['Receita projetada/ha', summary.projectedRevenuePerHectare, 'trending-up', 'success'],
          ['Lucro projetado/ha', summary.projectedProfitPerHectare, 'chart-no-axes-combined'],
        );
      default:
        return this.indicatorsFor(
          ['Custo realizado/ha', summary.realizedCostPerHectare, 'briefcase-business', 'warning'],
          ['Receita realizada/ha', summary.realizedRevenuePerHectare, 'trending-up', 'success'],
          ['Lucro realizado/ha', summary.realizedProfitPerHectare, 'wallet'],
        );
    }
  });

  private indicatorsFor(
    ...indicators: readonly [string, number | null, string, SummaryCardTone?][]
  ): readonly PerHectareIndicator[] {
    return indicators
      .filter(([, value]) => value !== null)
      .map(([title, value, icon, tone]) => ({
        title,
        value: value!,
        icon,
        tone: tone ?? this.profitTone(value!),
      }));
  }

  private profitTone(value: number): SummaryCardTone {
    return value > 0 ? 'success' : value < 0 ? 'danger' : 'neutral';
  }
}
