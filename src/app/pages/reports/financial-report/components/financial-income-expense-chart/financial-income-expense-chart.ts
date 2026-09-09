import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { FinancialCumulativeEvolutionPoint } from '../../../../../core/models/financial-report.models';
import { ThemeStore } from '../../../../../core/stores/theme.store';

const incomeColor = '#22C55E';
const expenseColor = '#DC2626';
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const monthlyPeriodFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

@Component({
  selector: 'gd-financial-income-expense-chart',
  imports: [BaseChartDirective],
  templateUrl: './financial-income-expense-chart.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialIncomeExpenseChart {
  readonly points = input.required<readonly FinancialCumulativeEvolutionPoint[]>();

  private readonly themeStore = inject(ThemeStore);
  private readonly chartDirective = viewChild(BaseChartDirective);

  protected readonly chartType = 'line' as const;
  protected readonly hasData = computed(() =>
    this.points().some(
      (point) => point.cumulativeIncome !== 0 || point.cumulativeExpense !== 0,
    ),
  );
  protected readonly chartWidth = computed(() => {
    const bucketWidth = this.points().some((point) => point.period.includes('Q')) ? 96 : 72;
    return Math.max(this.points().length * bucketWidth, 520);
  });
  protected readonly chartData = computed<ChartConfiguration<'line'>['data']>(() => ({
    labels: this.points().map((point) => point.label),
    datasets: [
      {
        label: 'Receitas acumuladas',
        data: this.points().map((point) => point.cumulativeIncome),
        borderColor: incomeColor,
        backgroundColor: incomeColor,
        borderWidth: 2.5,
        tension: 0.2,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHitRadius: 16,
      },
      {
        label: 'Despesas acumuladas',
        data: this.points().map((point) => point.cumulativeExpense),
        borderColor: expenseColor,
        backgroundColor: expenseColor,
        borderWidth: 2.5,
        tension: 0.2,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHitRadius: 16,
      },
    ],
  }));
  protected readonly chartOptions = computed<ChartConfiguration<'line'>['options']>(() => {
    const dark = this.themeStore.isDark();

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
          },
        },
      },
      scales: {
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: {
            color: dark ? '#9CA3AF' : '#6B7280',
            autoSkip: true,
            maxRotation: 0,
            padding: 10,
          },
        },
        y: {
          beginAtZero: true,
          min: 0,
          border: { display: false },
          grid: {
            color: dark ? 'rgba(229, 231, 235, 0.12)' : 'rgba(31, 41, 55, 0.10)',
            drawTicks: false,
          },
          ticks: {
            color: dark ? '#9CA3AF' : '#6B7280',
            callback: (value) => this.formatAxisCurrency(Number(value)),
            padding: 8,
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

  private formatAxisCurrency(value: number): string {
    return compactCurrencyFormatter.format(value);
  }

  private periodTitle(index: number): string {
    const point = this.points()[index];
    if (!point) {
      return '';
    }

    const year = point.periodStart.slice(0, 4);
    if (point.period.includes('Q')) {
      return `${point.label} de ${year}`;
    }

    return monthlyPeriodFormatter.format(new Date(`${point.periodStart}T00:00:00Z`));
  }
}
