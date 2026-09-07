import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideDynamicIcon } from '@lucide/angular';
import { ChartConfiguration, TooltipItem } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { finalize } from 'rxjs';

import {
  HarvestCategoryBreakdown,
  HarvestCategoryMovement,
} from '../../../../core/models/harvest-season.models';
import { HarvestSeasonService } from '../../../../core/services/harvest-season.service';
import { ThemeStore } from '../../../../core/stores/theme.store';
import { BrCurrencyPipe } from '../../../../shared/pipes/br-currency.pipe';
import { Card, EmptyState, ErrorState, Skeleton, Tooltip } from '../../../../shared/ui';

type CategoryMovementType = 'EXPENSE' | 'INCOME';
type CategoryMovementViewMode = 'chart' | 'list';

interface ChartThemeColors {
  muted: string;
  grid: string;
  surface: string;
  foreground: string;
  border: string;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const percentageFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const compactNumberFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

@Component({
  selector: 'gd-harvest-category-movements',
  host: { class: 'block' },
  imports: [
    BaseChartDirective,
    BrCurrencyPipe,
    Card,
    EmptyState,
    ErrorState,
    LucideDynamicIcon,
    Skeleton,
    Tooltip,
  ],
  templateUrl: './harvest-category-movements.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HarvestCategoryMovements {
  readonly harvestSeasonId = input.required<number>();

  private readonly harvestService = inject(HarvestSeasonService);
  private readonly themeStore = inject(ThemeStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly chartDirective = viewChild(BaseChartDirective);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedType = signal<CategoryMovementType>('EXPENSE');
  protected readonly viewMode = signal<CategoryMovementViewMode>('chart');
  private readonly expenses = signal<HarvestCategoryBreakdown | null>(null);
  private readonly incomes = signal<HarvestCategoryBreakdown | null>(null);

  protected readonly chartType = 'bar' as const;
  protected readonly title = computed(() => 'Movimentações por categoria');
  protected readonly totalLabel = computed(() =>
    this.selectedType() === 'EXPENSE'
      ? 'Total de despesas realizadas'
      : 'Total de receitas realizadas',
  );
  protected readonly activeBreakdown = computed(() =>
    this.selectedType() === 'EXPENSE' ? this.expenses() : this.incomes(),
  );
  protected readonly categories = computed(() => this.activeBreakdown()?.categories ?? []);
  protected readonly isEmpty = computed(
    () => !this.loading() && !this.error() && this.categories().length === 0,
  );
  protected readonly chartHeight = computed(
    () => `${Math.max(192, this.categories().length * 48)}px`,
  );
  protected readonly chartData = computed<ChartConfiguration<'bar'>['data']>(() => ({
    labels: this.categories().map((category) => this.truncateLabel(category.categoryName)),
    datasets: [
      {
        label: this.title(),
        data: this.categories().map((category) => category.amount),
        backgroundColor: this.selectedType() === 'EXPENSE' ? '#DC2626' : '#16A34A',
        borderRadius: 5,
        borderSkipped: false,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
    ],
  }));
  protected readonly chartOptions = computed<ChartConfiguration<'bar'>['options']>(() => {
    const colors = this.themeColors();

    return {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: this.prefersReducedMotion() ? false : { duration: 350 },
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
          callbacks: {
            title: (items) => this.categoryAt(items[0]?.dataIndex)?.categoryName ?? '',
            label: (item) => this.tooltipLabel(item),
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: colors.grid, drawTicks: false },
          ticks: {
            color: colors.muted,
            callback: (value) => this.formatCompactCurrency(Number(value)),
          },
        },
        y: {
          border: { display: false },
          grid: { display: false },
          ticks: { color: colors.muted, font: { size: 12 }, padding: 8 },
        },
      },
    };
  });

  constructor() {
    effect(() => this.load(this.harvestSeasonId()));
    effect(() => {
      this.themeStore.theme();
      this.chartOptions();
      queueMicrotask(() => this.chartDirective()?.update());
    });
  }

  protected selectType(type: CategoryMovementType): void {
    this.selectedType.set(type);
  }

  protected selectViewMode(viewMode: CategoryMovementViewMode): void {
    this.viewMode.set(viewMode);
  }

  protected retry(): void {
    this.load(this.harvestSeasonId());
  }

  protected formatCurrency(value: number): string {
    return currencyFormatter.format(value);
  }

  protected formatPercentage(value: number): string {
    return `${percentageFormatter.format(value)}%`;
  }

  private load(harvestSeasonId: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.expenses.set(null);
    this.incomes.set(null);

    this.harvestService
      .getCategoryBreakdown(harvestSeasonId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (movements) => {
          this.expenses.set(movements.expenses);
          this.incomes.set(movements.incomes);
        },
        error: () => this.error.set('Não foi possível carregar as movimentações por categoria.'),
      });
  }

  private categoryAt(index: number | undefined): HarvestCategoryMovement | undefined {
    return index === undefined ? undefined : this.categories()[index];
  }

  private tooltipLabel(item: TooltipItem<'bar'>): string {
    const category = this.categoryAt(item.dataIndex);

    return `${this.formatCurrency(category?.amount ?? item.parsed.x ?? 0)} · ${this.formatPercentage(category?.percentage ?? 0)}`;
  }

  private truncateLabel(label: string): string {
    return label.length > 28 ? `${label.slice(0, 27)}…` : label;
  }

  private formatCompactCurrency(value: number): string {
    if (Math.abs(value) >= 1000) {
      return `R$ ${compactNumberFormatter.format(value / 1000)}k`;
    }

    return `R$ ${compactNumberFormatter.format(value)}`;
  }

  private themeColors(): ChartThemeColors {
    return this.themeStore.isDark()
      ? {
          muted: '#9CA3AF',
          grid: 'rgba(229, 231, 235, 0.12)',
          surface: '#16231D',
          foreground: '#E5E7EB',
          border: '#263A30',
        }
      : {
          muted: '#6B7280',
          grid: 'rgba(31, 41, 55, 0.10)',
          surface: '#FFFFFF',
          foreground: '#1F2937',
          border: '#DDE5DD',
        };
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
    );
  }
}
