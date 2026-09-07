import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ChartConfiguration, Plugin } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import {
  HarvestPlanningComparisonMetric,
  HarvestSeasonComparisonSemantic,
} from '../../../../../core/models/harvest-season.models';
import { ThemeStore } from '../../../../../core/stores/theme.store';
import { Card } from '../../../../../shared/ui';

export interface PlanningComparisonCardModel {
  title: string;
  projectedDescription: string;
  realizedDescription: string;
  icon: string;
  plannedColor: string;
  currentColor: string;
  explanationMode: 'AMOUNT' | 'PERCENTAGE' | 'PERCENTAGE_POINTS';
  metric: HarvestPlanningComparisonMetric;
}

interface ChartThemeColors {
  muted: string;
  grid: string;
  zeroGrid: string;
  foreground: string;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const percentageFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const compactFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

@Component({
  selector: 'gd-planning-comparison-card',
  imports: [BaseChartDirective, Card, LucideDynamicIcon],
  templateUrl: './planning-comparison-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningComparisonCard {
  readonly card = input.required<PlanningComparisonCardModel>();
  readonly currentLabel = input.required<string>();
  readonly basis = input.required<'PROJECTED' | 'REALIZED'>();

  private readonly themeStore = inject(ThemeStore);
  private readonly chartDirective = viewChild(BaseChartDirective);

  protected readonly chartType = 'bar' as const;
  protected readonly chartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const { metric, plannedColor, currentColor } = this.card();

    return {
      labels: ['Planejado', this.currentLabel()],
      datasets: [
        {
          data: [metric.planned, metric.current],
          backgroundColor: [plannedColor, currentColor],
          borderColor: [plannedColor, currentColor],
          borderWidth: 0,
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.56,
          categoryPercentage: 0.74,
        },
      ],
    };
  });
  protected readonly chartOptions = computed<ChartConfiguration<'bar'>['options']>(() => {
    const colors = this.themeColors();

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: this.prefersReducedMotion() ? false : { duration: 350 },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      layout: { padding: { top: 26, right: 4, left: 4 } },
      scales: {
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: {
            color: colors.muted,
            font: { size: 11 },
            maxRotation: 0,
            padding: 8,
          },
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: {
            color: (context) => (context.tick.value === 0 ? colors.zeroGrid : colors.grid),
            lineWidth: (context) => (context.tick.value === 0 ? 1.5 : 1),
            drawTicks: false,
          },
          ticks: {
            color: colors.muted,
            font: { size: 10 },
            maxTicksLimit: 4,
            padding: 6,
            callback: (value) => this.formatAxisValue(Number(value)),
          },
        },
      },
    };
  });
  protected readonly chartPlugins = computed<Plugin<'bar'>[]>(() => [this.valueLabelsPlugin()]);
  protected readonly semanticClasses = computed(() =>
    this.semanticClass(this.card().metric.semantic),
  );
  protected readonly arrow = computed(() => this.directionArrow(this.card().metric.difference));
  protected readonly formattedDifference = computed(() =>
    this.formatDifference(this.card().metric),
  );
  protected readonly formattedPercentageDifference = computed(() => {
    const percentageDifference = this.card().metric.percentageDifference;

    if (percentageDifference === null) {
      return null;
    }

    return `${percentageDifference > 0 ? '+' : ''}${percentageFormatter.format(percentageDifference)}%`;
  });
  protected readonly explanation = computed(() => this.createExplanation());
  protected readonly accessibleDescription = computed(() => {
    const { title, metric } = this.card();

    return `${title}. Planejado: ${this.formatValue(metric, metric.planned)}. ${this.currentLabel()}: ${this.formatValue(metric, metric.current)}. Diferença: ${this.formattedDifference()}. ${this.positionLabel(metric)}.`;
  });

  constructor() {
    effect(() => {
      this.themeStore.theme();
      this.chartOptions();
      queueMicrotask(() => this.chartDirective()?.update());
    });
  }

  protected formatValue(metric: HarvestPlanningComparisonMetric, value: number): string {
    return metric.differenceUnit === 'PERCENTAGE_POINTS'
      ? `${percentageFormatter.format(value)}%`
      : currencyFormatter.format(value);
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

  private createExplanation(): string {
    const { metric } = this.card();
    const direction = this.directionLabel(metric);
    const description =
      this.basis() === 'PROJECTED'
        ? this.card().projectedDescription
        : this.card().realizedDescription;

    if (this.card().explanationMode === 'PERCENTAGE_POINTS') {
      return `${description} está ${this.formatAbsolute(metric.difference)} pontos percentuais ${direction} do planejado.`;
    }

    if (this.card().explanationMode === 'PERCENTAGE' && metric.percentageDifference !== null) {
      return `${description} está ${this.formatAbsolute(metric.percentageDifference)}% ${direction} do planejado.`;
    }

    return `${description} está ${currencyFormatter.format(Math.abs(metric.difference))} ${direction} do planejado.`;
  }

  private valueLabelsPlugin(): Plugin<'bar'> {
    return {
      id: 'planning-comparison-value-labels',
      afterDatasetsDraw: (chart) => {
        const meta = chart.getDatasetMeta(0);
        const dataset = chart.data.datasets[0];
        const metric = this.card().metric;

        chart.ctx.save();
        chart.ctx.fillStyle = this.themeColors().foreground;
        chart.ctx.font = '600 11px Inter, sans-serif';
        chart.ctx.textAlign = 'center';

        meta.data.forEach((bar, index) => {
          const value = dataset.data[index];
          if (typeof value !== 'number') {
            return;
          }

          const isNegative = value < 0;
          const labelY = isNegative ? bar.y + 14 : bar.y - 8;
          chart.ctx.fillText(this.formatValue(metric, value), bar.x, labelY);
        });

        chart.ctx.restore();
      },
    };
  }

  private formatDifference(metric: HarvestPlanningComparisonMetric): string {
    const sign = metric.difference > 0 ? '+' : '';
    const value =
      metric.differenceUnit === 'PERCENTAGE_POINTS'
        ? `${percentageFormatter.format(metric.difference)} p.p.`
        : currencyFormatter.format(metric.difference);

    return `${sign}${value}`;
  }

  private formatAxisValue(value: number): string {
    const metric = this.card().metric;

    if (metric.differenceUnit === 'PERCENTAGE_POINTS') {
      return `${compactFormatter.format(value)}%`;
    }

    const absoluteValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absoluteValue >= 1000) {
      return `${sign}R$ ${compactFormatter.format(absoluteValue / 1000)} mil`;
    }

    return `${sign}R$ ${compactFormatter.format(absoluteValue)}`;
  }

  private directionArrow(difference: number): string {
    return difference > 0 ? '↑' : difference < 0 ? '↓' : '→';
  }

  private directionLabel(metric: HarvestPlanningComparisonMetric): string {
    if (metric.position === 'ON_TARGET') {
      return 'conforme';
    }

    return metric.position === 'ABOVE_PLANNED' ? 'acima' : 'abaixo';
  }

  private formatAbsolute(value: number): string {
    return percentageFormatter.format(Math.abs(value));
  }

  private semanticClass(semantic: HarvestSeasonComparisonSemantic): string {
    return semantic === 'BETTER'
      ? 'text-success'
      : semantic === 'WORSE'
        ? 'text-danger'
        : 'text-text-muted';
  }

  private themeColors(): ChartThemeColors {
    return this.themeStore.isDark()
      ? {
          muted: '#9CA3AF',
          grid: 'rgba(229, 231, 235, 0.12)',
          zeroGrid: 'rgba(229, 231, 235, 0.28)',
          foreground: '#E5E7EB',
        }
      : {
          muted: '#6B7280',
          grid: 'rgba(31, 41, 55, 0.10)',
          zeroGrid: 'rgba(31, 41, 55, 0.24)',
          foreground: '#1F2937',
        };
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
}
