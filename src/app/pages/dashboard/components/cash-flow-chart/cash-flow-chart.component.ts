import { ChangeDetectionStrategy, Component, computed, effect, inject, input, viewChild } from '@angular/core';
import { ChartConfiguration, ScriptableContext } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { ThemeStore } from '../../../../core/stores/theme.store';
import { Card } from '../../../../shared/ui';
import { CASH_FLOW_CHART_MOCK } from '../../mocks/cash-flow-chart.mock';
import { CashFlowChartPoint } from '../../models/cash-flow-chart.models';

const chartLineColor = '#22C55E';
const chartFillColor = 'rgba(34, 197, 94, 0.18)';
const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface ChartThemeColors {
  muted: string;
  grid: string;
  zeroGrid: string;
  surface: string;
  foreground: string;
  border: string;
}

@Component({
  selector: 'gd-cash-flow-chart',
  imports: [BaseChartDirective, Card],
  templateUrl: './cash-flow-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashFlowChartComponent {
  readonly data = input<readonly CashFlowChartPoint[]>(CASH_FLOW_CHART_MOCK);

  private readonly themeStore = inject(ThemeStore);
  private readonly chartDirective = viewChild(BaseChartDirective);

  protected readonly chartType = 'line' as const;
  protected readonly chartData = computed<ChartConfiguration<'line'>['data']>(() => ({
    labels: this.data().map((point) => point.label),
    datasets: [{
      label: 'Saldo',
      data: this.data().map((point) => point.value),
      borderColor: chartLineColor,
      borderWidth: 2,
      tension: 0.35,
      fill: true,
      backgroundColor: this.createGradient,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHitRadius: 16,
      pointBackgroundColor: chartLineColor,
      pointBorderColor: chartLineColor,
    }],
  }));
  protected readonly chartOptions = computed<ChartConfiguration<'line'>['options']>(() => {
    const colors = this.themeColors();

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: this.prefersReducedMotion() ? false : { duration: 500 },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          backgroundColor: colors.surface,
          titleColor: colors.foreground,
          bodyColor: colors.foreground,
          borderColor: colors.border,
          borderWidth: 1,
          padding: 12,
          callbacks: { label: (context) => `Saldo: ${this.formatCurrency(context.parsed.y ?? 0)}` },
        },
      },
      scales: {
        x: {
          border: { display: false },
          grid: { color: colors.grid, drawTicks: false },
          ticks: { color: colors.muted, padding: 10 },
        },
        y: {
          border: { display: false },
          grid: {
            color: (context) => (context.tick.value === 0 ? colors.zeroGrid : colors.grid),
            lineWidth: (context) => (context.tick.value === 0 ? 1.25 : 1),
            drawTicks: false,
          },
          ticks: {
            color: colors.muted,
            padding: 10,
            callback: (value) => this.formatCompactCurrency(Number(value)),
          },
        },
      },
    };
  });
  protected readonly accessiblePoints = computed(() =>
    this.data().map((point) => ({
      ...point,
      month: this.monthName(point.label),
      formattedValue: this.formatCurrency(point.value),
    })),
  );

  constructor() {
    effect(() => {
      this.themeStore.theme();
      this.chartOptions();
      queueMicrotask(() => this.chartDirective()?.update());
    });
  }

  protected formatCompactCurrency(value: number): string {
    const absoluteValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absoluteValue === 0) {
      return 'R$ 0';
    }

    if (absoluteValue >= 1000) {
      return `${sign}R$ ${compactCurrencyFormatter.format(absoluteValue / 1000)}k`;
    }

    return `${sign}R$ ${compactCurrencyFormatter.format(absoluteValue)}`;
  }

  protected formatCurrency(value: number): string {
    return currencyFormatter.format(value);
  }

  private readonly createGradient = (context: ScriptableContext<'line'>): CanvasGradient | string => {
    const { chart } = context;
    const { chartArea } = chart;

    if (!chartArea) {
      return chartFillColor;
    }

    const gradient = chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, chartFillColor);
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');

    return gradient;
  };

  private themeColors(): ChartThemeColors {
    return this.themeStore.isDark()
      ? {
          muted: '#9CA3AF',
          grid: 'rgba(229, 231, 235, 0.12)',
          zeroGrid: 'rgba(229, 231, 235, 0.28)',
          surface: '#16231D',
          foreground: '#E5E7EB',
          border: '#263A30',
        }
      : {
          muted: '#6B7280',
          grid: 'rgba(31, 41, 55, 0.10)',
          zeroGrid: 'rgba(31, 41, 55, 0.24)',
          surface: '#FFFFFF',
          foreground: '#1F2937',
          border: '#DDE5DD',
        };
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  }

  private monthName(label: string): string {
    const months: Record<string, string> = {
      Jan: 'Janeiro',
      Fev: 'Fevereiro',
      Mar: 'Março',
      Abr: 'Abril',
      Mai: 'Maio',
      Jun: 'Junho',
      Jul: 'Julho',
      Ago: 'Agosto',
      Set: 'Setembro',
      Out: 'Outubro',
      Nov: 'Novembro',
      Dez: 'Dezembro',
    };

    return months[label] ?? label;
  }
}
