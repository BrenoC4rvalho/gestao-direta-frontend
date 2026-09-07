import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { HarvestSeasonDetailSummary } from '../../../../core/models/harvest-season.models';
import { BrCurrencyPipe } from '../../../../shared/pipes/br-currency.pipe';
import { EmptyState, SummaryCard, SummaryCardTone, Tooltip } from '../../../../shared/ui';

interface PerHectareIndicator {
  title: string;
  value: number;
  icon: string;
  tone: SummaryCardTone;
}

interface PerHectareIndicatorGroup {
  title: string;
  indicators: readonly PerHectareIndicator[];
}

@Component({
  selector: 'gd-per-hectare-indicators',
  imports: [BrCurrencyPipe, EmptyState, SummaryCard, Tooltip],
  templateUrl: './per-hectare-indicators.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerHectareIndicators {
  readonly summary = input.required<HarvestSeasonDetailSummary>();

  protected readonly tooltip =
    'Indicadores financeiros calculados com base na área total da Safra.';
  protected readonly groups = computed<readonly PerHectareIndicatorGroup[]>(() => {
    const summary = this.summary();

    return [
      this.group('Planejamento', [
        ['Custo planejado/ha', summary.plannedCostPerHectare, 'briefcase-business', 'warning'],
        ['Receita planejada/ha', summary.plannedRevenuePerHectare, 'trending-up', 'success'],
        ['Resultado planejado/ha', summary.plannedResultPerHectare, 'chart-no-axes-combined'],
      ]),
      this.group('Projeção', [
        ['Custo projetado/ha', summary.projectedCostPerHectare, 'briefcase-business', 'warning'],
        ['Receita projetada/ha', summary.projectedRevenuePerHectare, 'trending-up', 'success'],
        ['Lucro projetado/ha', summary.projectedProfitPerHectare, 'chart-no-axes-combined'],
      ]),
      this.group('Realizado', [
        ['Custo realizado/ha', summary.realizedCostPerHectare, 'briefcase-business', 'warning'],
        ['Receita realizada/ha', summary.realizedRevenuePerHectare, 'trending-up', 'success'],
        ['Lucro realizado/ha', summary.realizedProfitPerHectare, 'wallet'],
      ]),
    ].filter((group) => group.indicators.length > 0);
  });

  private group(
    title: string,
    indicators: readonly [string, number | null, string, SummaryCardTone?][],
  ): PerHectareIndicatorGroup {
    return {
      title,
      indicators: indicators
        .filter(([, value]) => value !== null)
        .map(([indicatorTitle, value, icon, tone]) => ({
          title: indicatorTitle,
          value: value!,
          icon,
          tone: tone ?? this.profitTone(value!),
        })),
    };
  }

  private profitTone(value: number): SummaryCardTone {
    return value > 0 ? 'success' : value < 0 ? 'danger' : 'neutral';
  }
}
