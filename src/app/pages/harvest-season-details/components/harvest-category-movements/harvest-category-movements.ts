import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
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
  ComparisonSemantic,
  HarvestCategoryBreakdown,
  HarvestCategoryComparison,
  HarvestCategoryComparisonBreakdown,
  HarvestCategoryComparisonCategory,
  HarvestCategoryComparisonStatus,
  HarvestCategoryMovement,
} from '../../../../core/models/harvest-season.models';
import { HarvestSeasonService } from '../../../../core/services/harvest-season.service';
import { ThemeStore } from '../../../../core/stores/theme.store';
import { BrCurrencyPipe } from '../../../../shared/pipes/br-currency.pipe';
import { Card, EmptyState, ErrorState, Skeleton, Tooltip } from '../../../../shared/ui';

type CategoryAnalysisMode = 'movements' | 'comparison';
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
  selector: 'gd-harvest-category-analysis',
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
export class HarvestCategoryAnalysis {
  readonly harvestSeasonId = input.required<number>();

  private readonly harvestService = inject(HarvestSeasonService);
  private readonly themeStore = inject(ThemeStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly chartDirective = viewChild(BaseChartDirective);
  private readonly controlsButton = viewChild<ElementRef<HTMLElement>>('controlsButton');
  private readonly controlsMenu = viewChild<ElementRef<HTMLElement>>('controlsMenu');

  protected readonly movementsLoading = signal(false);
  protected readonly movementsError = signal<string | null>(null);
  protected readonly comparisonLoading = signal(false);
  protected readonly comparisonError = signal<string | null>(null);
  protected readonly analysisMode = signal<CategoryAnalysisMode>('movements');
  protected readonly selectedType = signal<CategoryMovementType>('EXPENSE');
  protected readonly viewMode = signal<CategoryMovementViewMode>('chart');
  protected readonly controlsMenuOpen = signal(false);
  private readonly expenses = signal<HarvestCategoryBreakdown | null>(null);
  private readonly incomes = signal<HarvestCategoryBreakdown | null>(null);
  private readonly comparison = signal<HarvestCategoryComparison | null>(null);

  protected readonly chartType = 'bar' as const;
  protected readonly loading = computed(() =>
    this.analysisMode() === 'movements' ? this.movementsLoading() : this.comparisonLoading(),
  );
  protected readonly error = computed(() =>
    this.analysisMode() === 'movements' ? this.movementsError() : this.comparisonError(),
  );
  protected readonly activeBreakdown = computed(() =>
    this.selectedType() === 'EXPENSE' ? this.expenses() : this.incomes(),
  );
  protected readonly activeComparison = computed<HarvestCategoryComparisonBreakdown | null>(() => {
    const comparison = this.comparison();
    if (!comparison) return null;
    return this.selectedType() === 'EXPENSE' ? comparison.expenses : comparison.incomes;
  });
  protected readonly movementCategories = computed(() => this.activeBreakdown()?.categories ?? []);
  protected readonly comparisonCategories = computed(() => this.activeComparison()?.categories ?? []);
  protected readonly categories = computed(() =>
    this.analysisMode() === 'movements' ? this.movementCategories() : this.comparisonCategories(),
  );
  protected readonly isEmpty = computed(
    () => !this.loading() && !this.error() && this.categories().length === 0,
  );
  protected readonly chartHeight = computed(() =>
    `${Math.max(192, this.categories().length * (this.analysisMode() === 'comparison' ? 64 : 48))}px`,
  );
  protected readonly chartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    if (this.analysisMode() === 'comparison') {
      const isExpense = this.selectedType() === 'EXPENSE';
      return {
        labels: this.comparisonCategories().map((category) => this.truncateLabel(category.categoryName)),
        datasets: [
          {
            label: 'Planejado',
            data: this.comparisonCategories().map((category) => category.plannedAmount),
            backgroundColor: isExpense ? '#FCA5A5' : '#86EFAC',
            borderRadius: 5,
            borderSkipped: false,
            barPercentage: 0.68,
            categoryPercentage: 0.76,
          },
          {
            label: 'Realizado',
            data: this.comparisonCategories().map((category) => category.realizedAmount),
            backgroundColor: isExpense ? '#DC2626' : '#16A34A',
            borderRadius: 5,
            borderSkipped: false,
            barPercentage: 0.68,
            categoryPercentage: 0.76,
          },
        ],
      };
    }

    return {
      labels: this.movementCategories().map((category) => this.truncateLabel(category.categoryName)),
      datasets: [
        {
          label: 'Movimentações',
          data: this.movementCategories().map((category) => category.amount),
          backgroundColor: this.selectedType() === 'EXPENSE' ? '#DC2626' : '#16A34A',
          borderRadius: 5,
          borderSkipped: false,
          barPercentage: 0.6,
          categoryPercentage: 0.8,
        },
      ],
    };
  });
  protected readonly chartOptions = computed<ChartConfiguration<'bar'>['options']>(() => {
    const colors = this.themeColors();
    const isComparison = this.analysisMode() === 'comparison';

    return {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: this.prefersReducedMotion() ? false : { duration: 350 },
      plugins: {
        legend: {
          display: isComparison,
          position: 'bottom',
          labels: { color: colors.muted, boxWidth: 10, boxHeight: 10, padding: 16 },
        },
        tooltip: {
          displayColors: isComparison,
          backgroundColor: colors.surface,
          titleColor: colors.foreground,
          bodyColor: colors.foreground,
          borderColor: colors.border,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            title: (items) => this.categoryNameAt(items[0]?.dataIndex),
            label: (item) => this.tooltipLabel(item),
            afterLabel: (item) => this.comparisonTooltipDetails(item),
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: colors.grid, drawTicks: false },
          ticks: { color: colors.muted, callback: (value) => this.formatCompactCurrency(Number(value)) },
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
    effect(() => this.loadMovements(this.harvestSeasonId()));
    effect(() => {
      this.themeStore.theme();
      this.chartOptions();
      queueMicrotask(() => this.chartDirective()?.update());
    });
  }

  protected selectAnalysisMode(mode: CategoryAnalysisMode): void {
    this.analysisMode.set(mode);
    if (mode === 'comparison' && !this.comparison() && !this.comparisonLoading()) {
      this.loadComparison(this.harvestSeasonId());
    }
  }

  protected selectType(type: CategoryMovementType): void {
    this.selectedType.set(type);
  }

  protected selectViewMode(viewMode: CategoryMovementViewMode): void {
    this.viewMode.set(viewMode);
  }

  protected toggleControlsMenu(): void {
    this.controlsMenuOpen.update((isOpen) => !isOpen);
  }

  protected closeControlsMenuWhenClickingOutside(event: MouseEvent): void {
    const target = event.target as Node;
    const clickedButton = this.controlsButton()?.nativeElement.contains(target) ?? false;
    const clickedMenu = this.controlsMenu()?.nativeElement.contains(target) ?? false;

    if (!clickedButton && !clickedMenu) this.controlsMenuOpen.set(false);
  }

  protected retry(): void {
    if (this.analysisMode() === 'comparison') {
      this.loadComparison(this.harvestSeasonId());
      return;
    }
    this.loadMovements(this.harvestSeasonId());
  }

  protected formatCurrency(value: number): string {
    return currencyFormatter.format(value);
  }

  protected formatPercentage(value: number): string {
    return `${percentageFormatter.format(value)}%`;
  }

  protected differenceText(category: HarvestCategoryComparisonCategory): string {
    if (category.status === 'NO_MOVEMENT') return '—';
    const sign = category.status === 'ABOVE_PLAN' || category.status === 'UNPLANNED' ? '+' : '';
    const percentage =
      category.percentageDifference === null
        ? ''
        : ` (${sign}${this.formatPercentage(category.percentageDifference)})`;
    return `${sign}${this.formatCurrency(category.difference)}${percentage}`;
  }

  protected statusLabel(status: HarvestCategoryComparisonStatus): string {
    return (
      {
        ABOVE_PLAN: 'Acima do planejado',
        BELOW_PLAN: 'Abaixo do planejado',
        ON_PLAN: 'No planejado',
        UNPLANNED: 'Não planejado',
        NO_MOVEMENT: 'Sem movimentação',
      } satisfies Record<HarvestCategoryComparisonStatus, string>
    )[status];
  }

  private statusTooltipLabel(status: HarvestCategoryComparisonStatus): string {
    if (status === 'UNPLANNED') {
      return this.selectedType() === 'EXPENSE'
        ? 'Gasto não previsto no planejamento'
        : 'Receita não prevista no planejamento';
    }
    return this.statusLabel(status);
  }

  protected semanticClass(semantic: ComparisonSemantic): string {
    return (
      {
        BETTER: 'bg-success/10 text-success',
        WORSE: 'bg-danger/10 text-danger',
        NEUTRAL: 'bg-surface text-text-muted',
      } satisfies Record<ComparisonSemantic, string>
    )[semantic];
  }

  private loadMovements(harvestSeasonId: number): void {
    this.movementsLoading.set(true);
    this.movementsError.set(null);
    this.expenses.set(null);
    this.incomes.set(null);
    this.comparison.set(null);
    this.comparisonError.set(null);

    this.harvestService
      .getCategoryBreakdown(harvestSeasonId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.movementsLoading.set(false)),
      )
      .subscribe({
        next: (movements) => {
          this.expenses.set(movements.expenses);
          this.incomes.set(movements.incomes);
        },
        error: () => this.movementsError.set('Não foi possível carregar as movimentações por categoria.'),
      });
  }

  private loadComparison(harvestSeasonId: number): void {
    this.comparisonLoading.set(true);
    this.comparisonError.set(null);

    this.harvestService
      .getCategoryComparison(harvestSeasonId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.comparisonLoading.set(false)),
      )
      .subscribe({
        next: (comparison) => this.comparison.set(comparison),
        error: () => this.comparisonError.set('Não foi possível carregar o comparativo por categoria.'),
      });
  }

  private categoryNameAt(index: number | undefined): string {
    if (index === undefined) return '';
    return this.analysisMode() === 'comparison'
      ? (this.comparisonCategories()[index]?.categoryName ?? '')
      : (this.movementCategories()[index]?.categoryName ?? '');
  }

  private tooltipLabel(item: TooltipItem<'bar'>): string {
    if (this.analysisMode() === 'comparison') {
      const category = this.comparisonCategories()[item.dataIndex];
      if (item.datasetIndex === 0 && !category?.planned) return 'Planejado: Não planejado';
      return `${item.dataset.label}: ${this.formatCurrency(item.parsed.x ?? 0)}`;
    }
    const category = this.movementCategories()[item.dataIndex];
    return `${this.formatCurrency(category?.amount ?? item.parsed.x ?? 0)} · ${this.formatPercentage(category?.percentage ?? 0)}`;
  }

  private comparisonTooltipDetails(item: TooltipItem<'bar'>): string[] {
    if (this.analysisMode() !== 'comparison' || item.datasetIndex !== 1) return [];
    const category = this.comparisonCategories()[item.dataIndex];
    if (!category) return [];
    const difference = category.status === 'NO_MOVEMENT' ? '' : `Diferença: ${this.differenceText(category)}`;
    return [difference, this.statusTooltipLabel(category.status)].filter(Boolean);
  }

  private truncateLabel(label: string): string {
    return label.length > 28 ? `${label.slice(0, 27)}…` : label;
  }

  private formatCompactCurrency(value: number): string {
    if (Math.abs(value) >= 1000) return `R$ ${compactNumberFormatter.format(value / 1000)}k`;
    return `R$ ${compactNumberFormatter.format(value)}`;
  }

  private themeColors(): ChartThemeColors {
    return this.themeStore.isDark()
      ? { muted: '#9CA3AF', grid: 'rgba(229, 231, 235, 0.12)', surface: '#16231D', foreground: '#E5E7EB', border: '#263A30' }
      : { muted: '#6B7280', grid: 'rgba(31, 41, 55, 0.10)', surface: '#FFFFFF', foreground: '#1F2937', border: '#DDE5DD' };
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  }
}
