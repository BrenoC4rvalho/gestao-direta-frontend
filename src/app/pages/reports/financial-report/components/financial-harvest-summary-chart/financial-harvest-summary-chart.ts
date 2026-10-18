import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { FinancialHarvestSummary } from '../../../../../core/models/financial-report.models';
import { ThemeStore } from '../../../../../core/stores/theme.store';

interface ChartThemeColors {
  muted: string;
  grid: string;
  zeroGrid: string;
  surface: string;
  foreground: string;
  border: string;
  info: string;
  income: string;
  expense: string;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const percentageFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

@Component({
  selector: 'gd-financial-harvest-summary-chart',
  imports: [BaseChartDirective],
  host: { class: 'block' },
  templateUrl: './financial-harvest-summary-chart.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialHarvestSummaryChart {
  readonly harvests = input.required<readonly FinancialHarvestSummary[]>();

  private readonly themeStore = inject(ThemeStore);

  protected readonly chartType = 'bar' as const;
  protected readonly chartHarvests = computed(() =>
    this.harvests().filter((harvest) => harvest.harvestSeasonId !== null),
  );
  protected readonly hasData = computed(() => this.chartHarvests().length > 0);
  protected readonly chartWidth = computed(() =>
    `${Math.max(560, this.chartHarvests().length * 168)}px`,
  );
  protected readonly chartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const colors = this.themeColors();
    const harvests = this.chartHarvests();

    return {
      labels: harvests.map((harvest) => harvest.harvestSeasonName),
      datasets: [
        this.dataset('Receita', harvests.map((harvest) => harvest.income), colors.income),
        this.dataset('Despesa', harvests.map((harvest) => harvest.expense), colors.expense),
        this.dataset('Resultado', harvests.map((harvest) => harvest.profit), colors.info),
      ],
    };
  });
  protected readonly chartOptions = computed<ChartConfiguration<'bar'>['options']>(() => {
    const colors = this.themeColors();

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.surface,
          titleColor: colors.foreground,
          bodyColor: colors.foreground,
          borderColor: colors.border,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            title: (items) => this.tooltipTitle(items[0]?.dataIndex ?? 0),
            label: (item) => `${item.dataset.label}: ${this.formatCurrency(Number(item.parsed.y))}`,
            afterBody: (items) => this.tooltipDetails(items[0]?.dataIndex ?? 0),
          },
        },
      },
      scales: {
        x: {
          stacked: false,
          offset: true,
          border: { display: false },
          grid: { display: false },
          ticks: {
            color: colors.muted,
            maxRotation: 0,
            autoSkip: false,
          },
        },
        y: {
          stacked: false,
          beginAtZero: true,
          border: { display: false },
          grid: {
            color: (context) =>
              context.tick.value === 0 ? colors.zeroGrid : colors.grid,
            lineWidth: (context) => (context.tick.value === 0 ? 1.5 : 1),
            drawTicks: false,
          },
          ticks: {
            color: colors.muted,
            padding: 8,
            callback: (value) => this.formatCompactCurrency(Number(value)),
          },
        },
      },
    };
  });

  protected formatCurrency(value: number): string {
    return currencyFormatter.format(value);
  }

  protected formatPercentage(value: number): string {
    return `${percentageFormatter.format(value)}%`;
  }

  protected ariaLabel(): string {
    return 'Gráfico comparativo de receitas, despesas e resultados por safra';
  }

  private dataset(label: string, data: readonly number[], color: string) {
    return {
      label,
      data: [...data],
      backgroundColor: color,
      borderColor: color,
      borderWidth: 0,
      borderRadius: 4,
      borderSkipped: false,
      barPercentage: 0.72,
      categoryPercentage: 0.78,
    };
  }

  private tooltipTitle(index: number): string {
    return this.chartHarvests()[index]?.harvestSeasonName ?? '';
  }

  private tooltipDetails(index: number): string[] {
    const harvest = this.chartHarvests()[index];
    const details = harvest?.details;
    if (!harvest || !details) return [];

    const rows = [
      `Margem: ${this.formatPercentage(harvest.marginPercentage)}`,
      `Participação no período: ${this.formatPercentage(details.periodRevenueShare)}`,
    ];

    if (details.incomeComparison) {
      rows.push(`Receita planejada: ${this.formatCurrency(details.incomeComparison.planned)}`);
    }
    if (details.expenseComparison) {
      rows.push(`Despesa planejada: ${this.formatCurrency(details.expenseComparison.planned)}`);
    }
    if (details.resultComparison) {
      rows.push(`Resultado planejado: ${this.formatCurrency(details.resultComparison.planned)}`);
    }
    if (details.resultPerHectare !== null) {
      rows.push(`Resultado/ha: ${this.formatCurrency(details.resultPerHectare)}`);
    }

    return rows;
  }

  private formatCompactCurrency(value: number): string {
    return compactCurrencyFormatter.format(value);
  }

  private themeColors(): ChartThemeColors {
    const dark = this.themeStore.isDark();

    return {
      muted: dark ? '#9CA3AF' : '#6B7280',
      grid: dark ? 'rgba(229, 231, 235, 0.12)' : 'rgba(31, 41, 55, 0.10)',
      zeroGrid: dark ? 'rgba(229, 231, 235, 0.32)' : 'rgba(31, 41, 55, 0.26)',
      surface: dark ? '#16231D' : '#FFFFFF',
      foreground: dark ? '#E5E7EB' : '#1F2937',
      border: dark ? '#263A30' : '#DDE5DD',
      info: this.cssColor('--color-info', '#2563EB'),
      income: this.cssColor('--color-success', '#16A34A'),
      expense: this.cssColor('--color-danger', '#DC2626'),
    };
  }

  private cssColor(variable: string, fallback: string): string {
    if (typeof document === 'undefined') return fallback;
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || fallback;
  }
}
