import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ChartConfiguration, ChartEvent } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { ThemeStore } from '../../../../../core/stores/theme.store';
import { FinancialEvolutionPoint } from '../../../../../core/models/financial-report.models';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

interface ChartThemeColors {
  muted: string;
  grid: string;
  zeroGrid: string;
  surface: string;
  foreground: string;
  border: string;
}

@Component({
  selector: 'gd-financial-evolution-chart',
  imports: [BaseChartDirective],
  templateUrl: './financial-evolution-chart.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialEvolutionChart {
  readonly points = input.required<readonly FinancialEvolutionPoint[]>();
  readonly periodSelected = output<FinancialEvolutionPoint>();

  private readonly themeStore = inject(ThemeStore);
  private readonly chartDirective = viewChild(BaseChartDirective);

  protected readonly chartType = 'bar' as const;
  protected readonly chartData = computed<ChartConfiguration<'bar' | 'line'>['data']>(() => ({
    labels: this.points().map((point) => point.label),
    datasets: [
      {
        type: 'bar',
        label: 'Receitas',
        data: this.points().map((point) => point.income),
        backgroundColor: '#22C55E',
        order: 1,
        stack: 'financial',
        categoryPercentage: 0.55,
        barPercentage: 0.8,
        borderRadius: 3,
        borderSkipped: false,
      },
      {
        type: 'bar',
        label: 'Despesas',
        data: this.points().map((point) => -Math.abs(point.expense)),
        backgroundColor: '#DC2626',
        order: 1,
        stack: 'financial',
        categoryPercentage: 0.55,
        barPercentage: 0.8,
        borderRadius: 3,
        borderSkipped: false,
      },
      {
        type: 'line',
        label: 'Saldo líquido',
        data: this.points().map((point) => point.netBalance),
        order: 0,
        borderColor: '#2563EB',
        backgroundColor: '#2563EB',
        borderWidth: 2,
        tension: 0.25,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointHitRadius: 16,
      },
    ],
  }));
  protected readonly chartOptions = computed<ChartConfiguration<'bar' | 'line'>['options']>(() => {
    const colors = this.themeColors();

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: colors.surface,
          titleColor: colors.foreground,
          bodyColor: colors.foreground,
          borderColor: colors.border,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (context) => {
              const value =
                context.dataset.label === 'Despesas'
                  ? Math.abs(context.parsed.y ?? 0)
                  : (context.parsed.y ?? 0);

              return `${context.dataset.label}: ${currencyFormatter.format(value)}`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          border: { display: false },
          grid: { display: false },
          ticks: { color: colors.muted, padding: 10 },
        },
        y: {
          stacked: true,
          border: { display: false },
          grid: {
            color: (context) => (context.tick.value === 0 ? colors.zeroGrid : colors.grid),
            lineWidth: (context) => (context.tick.value === 0 ? 1.25 : 1),
            drawTicks: false,
          },
          ticks: {
            color: colors.muted,
            padding: 10,
            callback: (value) => this.compactCurrency(Number(value)),
          },
        },
      },
    };
  });

  constructor() {
    effect(() => {
      this.themeStore.theme();
      this.chartOptions();
      queueMicrotask(() => this.chartDirective()?.update());
    });
  }

  protected selectPeriod(event: { event?: ChartEvent; active?: object[] }): void {
    const active = event.active?.[0] as { index?: unknown } | undefined;
    if (typeof active?.index !== 'number') return;
    const point = this.points()[active.index];
    if (point) this.periodSelected.emit(point);
  }

  protected formatCurrency(value: number): string {
    return currencyFormatter.format(value);
  }

  private compactCurrency(value: number): string {
    const absoluteValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absoluteValue === 0) return 'R$ 0';
    if (absoluteValue >= 1000)
      return `${sign}R$ ${compactCurrencyFormatter.format(absoluteValue / 1000)} mil`;

    return `${sign}R$ ${compactCurrencyFormatter.format(absoluteValue)}`;
  }

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
}
