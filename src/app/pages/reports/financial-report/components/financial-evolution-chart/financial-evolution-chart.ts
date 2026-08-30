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

import { FinancialEvolutionPoint } from '../../../../../core/models/financial-report.models';
import { ThemeStore } from '../../../../../core/stores/theme.store';
import { Tooltip } from '../../../../../shared/ui';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const MONTH_WIDTH = 72;
const QUARTER_WIDTH = 96;
const Y_AXIS_WIDTH = 68;

interface ChartThemeColors {
  muted: string;
  grid: string;
  zeroGrid: string;
  surface: string;
  foreground: string;
  border: string;
}

interface AxisScale {
  min: number;
  max: number;
  step: number;
  ticks: readonly number[];
}

type FinancialState = 'REALIZED' | 'PROJECTED' | 'OVERDUE';
type FinancialDirection = 'INCOME' | 'EXPENSE';

@Component({
  selector: 'gd-financial-evolution-chart',
  imports: [BaseChartDirective, Tooltip],
  templateUrl: './financial-evolution-chart.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialEvolutionChart {
  readonly points = input.required<readonly FinancialEvolutionPoint[]>();
  readonly periodSelected = output<FinancialEvolutionPoint>();

  private readonly themeStore = inject(ThemeStore);
  private readonly chartDirective = viewChild(BaseChartDirective);

  protected readonly chartType = 'bar' as const;
  protected readonly axisWidth = Y_AXIS_WIDTH;
  protected readonly stateLegendTooltip =
    'Sólido: realizado. Translúcido: projetado. Tom mais intenso: vencido.';
  protected readonly chartWidth = computed(() => {
    const width = this.points().some((point) => point.period.includes('Q'))
      ? QUARTER_WIDTH
      : MONTH_WIDTH;
    return Math.max(this.points().length * width, 520);
  });
  protected readonly scale = computed(() => this.createScale(this.points()));
  protected readonly chartData = computed<ChartConfiguration<'bar' | 'line'>['data']>(() => ({
    labels: this.points().map((point) => point.label),
    datasets: [
      this.barDataset(
        'Receitas realizadas',
        (point) => point.realizedIncome,
        '#22C55E',
        'INCOME',
        'REALIZED',
      ),
      this.barDataset(
        'Receitas projetadas',
        (point) => point.projectedIncome,
        'rgba(34, 197, 94, 0.28)',
        'INCOME',
        'PROJECTED',
      ),
      this.barDataset(
        'Receitas vencidas',
        (point) => point.overdueIncome,
        'rgba(34, 197, 94, 0.52)',
        'INCOME',
        'OVERDUE',
      ),
      this.barDataset(
        'Despesas realizadas',
        (point) => -point.realizedExpense,
        '#DC2626',
        'EXPENSE',
        'REALIZED',
      ),
      this.barDataset(
        'Despesas projetadas',
        (point) => -point.projectedExpense,
        'rgba(220, 38, 38, 0.28)',
        'EXPENSE',
        'PROJECTED',
      ),
      this.barDataset(
        'Despesas vencidas',
        (point) => -point.overdueExpense,
        'rgba(220, 38, 38, 0.52)',
        'EXPENSE',
        'OVERDUE',
      ),
      {
        type: 'line',
        label: 'Resultado realizado',
        data: this.points().map((point) => point.realizedResult),
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
    const scale = this.scale();

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      layout: { padding: { left: 4, right: 12 } },
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
            title: (contexts) => this.tooltipTitle(contexts[0]?.dataIndex ?? 0),
            label: () => '',
            afterBody: (contexts) => this.tooltipRows(contexts[0]?.dataIndex ?? 0),
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          border: { display: false },
          grid: { display: false },
          ticks: {
            color: (context) =>
              this.points()[context.index]?.currentPeriod ? '#2563EB' : colors.muted,
            padding: 10,
            maxRotation: 0,
            autoSkip: false,
          },
        },
        y: {
          stacked: true,
          min: scale.min,
          max: scale.max,
          ticks: { display: false, stepSize: scale.step },
          border: { display: false },
          grid: {
            color: (context) => (context.tick.value === 0 ? colors.zeroGrid : colors.grid),
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

  protected selectPeriod(event: { event?: ChartEvent; active?: object[] }): void {
    const active = event.active?.[0] as { index?: unknown } | undefined;
    if (typeof active?.index !== 'number') return;
    const point = this.points()[active.index];
    if (point) this.periodSelected.emit(point);
  }

  protected formatCurrency(value: number): string {
    return currencyFormatter.format(value);
  }

  protected axisPosition(value: number): number {
    const scale = this.scale();
    return ((scale.max - value) / (scale.max - scale.min)) * 100;
  }

  private barDataset(
    label: string,
    value: (point: FinancialEvolutionPoint) => number,
    backgroundColor: string,
    direction: FinancialDirection,
    state: FinancialState,
  ) {
    return {
      type: 'bar' as const,
      label,
      data: this.points().map(value),
      backgroundColor,
      borderWidth: 0,
      order: 1,
      stack: 'financial',
      categoryPercentage: 0.7,
      barPercentage: 0.78,
      borderRadius: this.points().map((point) => this.segmentRadius(point, direction, state)),
      borderSkipped: false,
      inflateAmount: 0,
    };
  }

  private segmentRadius(
    point: FinancialEvolutionPoint,
    direction: FinancialDirection,
    state: FinancialState,
  ) {
    if (!this.isOuterSegment(point, direction, state)) {
      return 0;
    }

    return direction === 'INCOME'
      ? { topLeft: 3, topRight: 3, bottomLeft: 0, bottomRight: 0 }
      : { topLeft: 0, topRight: 0, bottomLeft: 3, bottomRight: 3 };
  }

  private isOuterSegment(
    point: FinancialEvolutionPoint,
    direction: FinancialDirection,
    state: FinancialState,
  ): boolean {
    if (direction === 'INCOME') {
      if (state === 'OVERDUE') {
        return point.overdueIncome > 0;
      }

      if (state === 'PROJECTED') {
        return point.projectedIncome > 0 && point.overdueIncome === 0;
      }

      return (
        point.realizedIncome > 0 && point.projectedIncome === 0 && point.overdueIncome === 0
      );
    }

    if (state === 'OVERDUE') {
      return point.overdueExpense > 0;
    }

    if (state === 'PROJECTED') {
      return point.projectedExpense > 0 && point.overdueExpense === 0;
    }

    return (
      point.realizedExpense > 0 && point.projectedExpense === 0 && point.overdueExpense === 0
    );
  }

  private tooltipTitle(index: number): string {
    const point = this.points()[index];
    if (!point) return '';
    return `${point.label} · ${this.periodRange(point)}`;
  }

  private tooltipRows(index: number): string[] {
    const point = this.points()[index];
    if (!point) return [];
    const rows = [
      this.tooltipRow('Receitas realizadas', point.realizedIncome),
      this.tooltipRow('Receitas projetadas', point.projectedIncome),
      this.tooltipRow('Receitas vencidas', point.overdueIncome, point.overdueIncomeCount),
      this.tooltipRow('Despesas realizadas', point.realizedExpense),
      this.tooltipRow('Despesas projetadas', point.projectedExpense),
      this.tooltipRow('Despesas vencidas', point.overdueExpense, point.overdueExpenseCount),
    ].filter((row): row is string => row !== null);
    rows.push(`Resultado realizado: ${currencyFormatter.format(point.realizedResult)}`);
    return rows;
  }

  private tooltipRow(label: string, value: number, count?: number): string | null {
    if (value === 0 && !count) return null;
    const suffix = count ? ` · ${count} movimentação${count === 1 ? '' : 'ões'}` : '';
    return `${label}: ${currencyFormatter.format(value)}${suffix}`;
  }

  private periodRange(point: FinancialEvolutionPoint): string {
    const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' });
    const start = formatter.format(new Date(`${point.periodStart}T00:00:00Z`));
    const end = formatter.format(new Date(`${point.periodEnd}T00:00:00Z`));
    return start === end ? start : `${start} – ${end}`;
  }

  private createScale(points: readonly FinancialEvolutionPoint[]): AxisScale {
    const maximum = Math.max(
      1,
      ...points.map((point) => point.realizedIncome + point.projectedIncome + point.overdueIncome),
      ...points.map((point) => point.realizedResult),
    );
    const minimum = Math.min(
      -1,
      ...points.map((point) => -(point.realizedExpense + point.projectedExpense + point.overdueExpense)),
      ...points.map((point) => point.realizedResult),
    );
    const step = this.niceStep((maximum - minimum) / 5);
    const min = Math.floor(minimum / step) * step;
    const max = Math.ceil(maximum / step) * step;
    const ticks: number[] = [];
    for (let value = max; value >= min; value -= step) ticks.push(value);
    return { min, max, step, ticks };
  }

  private niceStep(value: number): number {
    const exponent = Math.pow(10, Math.floor(Math.log10(value)));
    const fraction = value / exponent;
    const factor = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    return factor * exponent;
  }

  private themeColors(): ChartThemeColors {
    return this.themeStore.isDark()
      ? {
          muted: '#9CA3AF',
          grid: 'rgba(229, 231, 235, 0.12)',
          zeroGrid: 'rgba(229, 231, 235, 0.32)',
          surface: '#16231D',
          foreground: '#E5E7EB',
          border: '#263A30',
        }
      : {
          muted: '#6B7280',
          grid: 'rgba(31, 41, 55, 0.10)',
          zeroGrid: 'rgba(31, 41, 55, 0.26)',
          surface: '#FFFFFF',
          foreground: '#1F2937',
          border: '#DDE5DD',
        };
  }
}
