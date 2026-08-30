import { ChangeDetectionStrategy, Component, computed, effect, inject, input, viewChild } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { FinancialCashFlowPoint } from '../../../../../core/models/financial-report.models';
import { ThemeStore } from '../../../../../core/stores/theme.store';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const periodFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

@Component({
  selector: 'gd-financial-cash-flow-chart',
  imports: [BaseChartDirective],
  templateUrl: './financial-cash-flow-chart.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialCashFlowChart {
  readonly points = input.required<readonly FinancialCashFlowPoint[]>();

  private readonly themeStore = inject(ThemeStore);
  private readonly chartDirective = viewChild(BaseChartDirective);

  protected readonly chartType = 'line' as const;
  protected readonly chartWidth = computed(() => {
    const bucketWidth = this.points().some((point) => point.period.includes('Q')) ? 96 : 72;
    return Math.max(this.points().length * bucketWidth, 520);
  });
  protected readonly scale = computed(() => this.createScale());
  protected readonly chartData = computed<ChartConfiguration<'line'>['data']>(() => ({
    labels: this.points().map((point) => point.label),
    datasets: [
      {
        label: 'Saldo previsto',
        data: this.points().map((point) => point.expectedBalance),
        borderColor: '#2563EB',
        borderWidth: 2.5,
        tension: 0.2,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointHitRadius: 16,
      },
      {
        label: 'Saldo projetado com atrasos',
        data: this.points().map((point) => point.projectedBalance),
        borderColor: 'rgba(37, 99, 235, 0.65)',
        borderDash: [6, 5],
        borderWidth: 2,
        tension: 0.2,
        pointRadius: 2,
        pointHoverRadius: 4,
        pointHitRadius: 16,
      },
    ],
  }));
  protected readonly chartOptions = computed<ChartConfiguration<'line'>['options']>(() => {
    const dark = this.themeStore.isDark();
    const scale = this.scale();

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      layout: { padding: { left: 4, right: 12 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: dark ? '#16231D' : '#FFFFFF',
          titleColor: dark ? '#E5E7EB' : '#1F2937',
          bodyColor: dark ? '#E5E7EB' : '#1F2937',
          borderColor: dark ? '#263A30' : '#DDE5DD',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            title: (items) => this.periodTitle(items[0]?.dataIndex ?? 0),
            label: (item) => `${item.dataset.label}: ${this.formatCurrency(item.parsed.y ?? 0)}`,
            afterBody: (items) => this.overdueTooltipRows(items[0]?.dataIndex ?? 0),
          },
        },
      },
      scales: {
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: {
            color: (context) =>
              this.points()[context.index]?.currentPeriod
                ? '#2563EB'
                : dark
                  ? '#9CA3AF'
                  : '#6B7280',
            autoSkip: false,
            maxRotation: 0,
            padding: 10,
          },
        },
        y: {
          min: scale.min,
          max: scale.max,
          ticks: { display: false, stepSize: scale.step },
          border: { display: false },
          grid: {
            color: (context) =>
              context.tick.value === 0
                ? dark
                  ? 'rgba(229, 231, 235, 0.32)'
                  : 'rgba(31, 41, 55, 0.26)'
                : dark
                  ? 'rgba(229, 231, 235, 0.12)'
                  : 'rgba(31, 41, 55, 0.10)',
            lineWidth: (context) => (context.tick.value === 0 ? 1.5 : 1),
            drawTicks: false,
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

  protected formatCurrency(value: number): string {
    return currencyFormatter.format(value);
  }

  protected formatAxisCurrency(value: number): string {
    return compactCurrencyFormatter.format(value);
  }

  protected axisPosition(value: number): number {
    const scale = this.scale();
    return ((scale.max - value) / (scale.max - scale.min)) * 100;
  }

  private createScale() {
    const values = this.points().flatMap((point) => [point.expectedBalance, point.projectedBalance, 0]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = Math.max(maxValue - minValue, Math.max(Math.abs(minValue), Math.abs(maxValue), 1000) * 0.24);
    const visualPadding = valueRange * 0.12;
    const rawStep = Math.max((maxValue + visualPadding - (minValue - visualPadding)) / 5, 1);
    const exponent = 10 ** Math.floor(Math.log10(rawStep));
    const fraction = rawStep / exponent;
    const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * exponent;
    const min = Math.floor((minValue - visualPadding) / step) * step;
    const max = Math.ceil((maxValue + visualPadding) / step) * step;
    const safeMax = min === max ? max + step : max;

    return {
      min,
      max: safeMax,
      step,
      ticks: Array.from(
        { length: Math.round((safeMax - min) / step) + 1 },
        (_, index) => safeMax - index * step,
      ),
    };
  }

  private periodTitle(index: number): string {
    const periodStart = this.points()[index]?.periodStart;
    return periodStart ? periodFormatter.format(new Date(`${periodStart}T00:00:00Z`)) : '';
  }

  private overdueTooltipRows(index: number): string[] {
    const point = this.points()[index];
    if (!point) return [];

    const rows: string[] = [];
    if (point.overdueIncome > 0) {
      rows.push(`Em atraso a receber: +${this.formatCurrency(point.overdueIncome)}`);
    }
    if (point.overdueExpense > 0) {
      rows.push(`Em atraso a pagar: -${this.formatCurrency(point.overdueExpense)}`);
    }
    return rows;
  }
}
