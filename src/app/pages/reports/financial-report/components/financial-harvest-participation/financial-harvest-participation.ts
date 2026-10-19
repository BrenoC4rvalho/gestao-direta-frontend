import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { FinancialHarvestSummary } from '../../../../../core/models/financial-report.models';
import { ThemeStore } from '../../../../../core/stores/theme.store';

interface ChartThemeColors {
  muted: string;
  surface: string;
  foreground: string;
  border: string;
  primary: string;
  accent: string;
  success: string;
  warning: string;
  info: string;
}

interface ParticipationEntry {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

type ParticipationMetric = 'income' | 'expense' | 'profit';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const percentageFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

@Component({
  selector: 'gd-financial-harvest-participation',
  imports: [BaseChartDirective],
  host: { class: 'block' },
  templateUrl: './financial-harvest-participation.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialHarvestParticipation {
  readonly harvests = input.required<readonly FinancialHarvestSummary[]>();

  private readonly themeStore = inject(ThemeStore);

  protected readonly chartType = 'doughnut' as const;
  protected readonly chartDefinitions = computed(() => {
    const colors = this.themeColors();
    return [
      this.chartDefinition('Participação nas receitas', 'income', colors),
      this.chartDefinition('Participação nas despesas', 'expense', colors),
      this.chartDefinition('Participação no resultado', 'profit', colors),
    ];
  });
  protected readonly negativeProfits = computed(() =>
    this.harvests()
      .filter((harvest) => harvest.profit < 0)
      .map((harvest) => ({ label: harvest.harvestSeasonName, value: harvest.profit })),
  );
  protected readonly netProfit = computed(() =>
    this.harvests().reduce((total, harvest) => total + harvest.profit, 0),
  );
  protected readonly hasAnyValue = computed(() =>
    this.chartDefinitions().some((definition) => definition.entries.length > 0) ||
    this.negativeProfits().length > 0,
  );

  protected formatCurrency(value: number): string {
    return currencyFormatter.format(value);
  }

  protected formatPercentage(value: number): string {
    return `${percentageFormatter.format(value)}%`;
  }

  protected ariaLabel(title: string): string {
    return `${title} por safra, incluindo Sem safra quando houver movimentações.`;
  }

  private chartDefinition(title: string, metric: ParticipationMetric, colors: ChartThemeColors) {
    const entries = this.entries(metric, colors);
    return {
      title,
      entries,
      data: {
        labels: entries.map((entry) => entry.label),
        datasets: [
          {
            data: entries.map((entry) => entry.value),
            backgroundColor: entries.map((entry) => entry.color),
            borderColor: colors.surface,
            borderWidth: 2,
            hoverOffset: 4,
          },
        ],
      } satisfies ChartConfiguration<'doughnut'>['data'],
      options: this.chartOptions(colors),
    };
  }

  private entries(metric: ParticipationMetric, colors: ChartThemeColors): ParticipationEntry[] {
    const source = this.harvests().map((harvest) => ({
      label: harvest.harvestSeasonName,
      value: metric === 'income' ? harvest.income : metric === 'expense' ? harvest.expense : harvest.profit,
      unallocated: harvest.harvestSeasonId === null,
    }));
    const positive = source.filter((entry) => entry.value > 0);
    const total = positive.reduce((sum, entry) => sum + entry.value, 0);
    const palette = [colors.primary, colors.accent, colors.info, colors.success, colors.warning];

    return positive.map((entry, index) => ({
      label: entry.label,
      value: entry.value,
      percentage: total === 0 ? 0 : (entry.value / total) * 100,
      color: entry.unallocated ? colors.muted : palette[index % palette.length],
    }));
  }

  private chartOptions(colors: ChartThemeColors): ChartConfiguration<'doughnut'>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      cutout: '64%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.surface,
          titleColor: colors.foreground,
          bodyColor: colors.foreground,
          borderColor: colors.border,
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (item) => {
              const value = Number(item.parsed);
              const total = (item.dataset.data as number[]).reduce((sum, amount) => sum + Number(amount), 0);
              const percentage = total === 0 ? 0 : (value / total) * 100;
              return `${this.formatCurrency(value)} (${this.formatPercentage(percentage)})`;
            },
          },
        },
      },
    };
  }

  private themeColors(): ChartThemeColors {
    const dark = this.themeStore.isDark();
    return {
      muted: dark ? '#9CA3AF' : '#6B7280',
      surface: dark ? '#16231D' : '#FFFFFF',
      foreground: dark ? '#E5E7EB' : '#1F2937',
      border: dark ? '#263A30' : '#DDE5DD',
      primary: this.cssColor('--color-primary', '#15803D'),
      accent: this.cssColor('--color-accent', '#22C55E'),
      success: this.cssColor('--color-success', '#16A34A'),
      warning: this.cssColor('--color-warning', '#F59E0B'),
      info: this.cssColor('--color-info', '#2563EB'),
    };
  }

  private cssColor(variable: string, fallback: string): string {
    if (typeof document === 'undefined') return fallback;
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || fallback;
  }
}
