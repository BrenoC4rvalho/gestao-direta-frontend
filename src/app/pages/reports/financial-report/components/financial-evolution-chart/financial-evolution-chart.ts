import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  TemplateRef,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { LucideDynamicIcon } from '@lucide/angular';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import {
  FinancialEvolutionPoint,
  FinancialReportGranularity,
} from '../../../../../core/models/financial-report.models';
import { ThemeStore } from '../../../../../core/stores/theme.store';
import { lockOverlayScroll } from '../../../../../shared/overlays/overlay-scroll-lock';
import { OverlayStack } from '../../../../../shared/overlays/overlay-stack';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const MONTH_WIDTH = 88;
const QUARTER_WIDTH = 112;
const BAR_THICKNESS = 28;
const BAR_CATEGORY_PERCENTAGE = 0.78;
const BAR_PERCENTAGE = 0.92;

interface ChartThemeColors {
  muted: string;
  grid: string;
  zeroGrid: string;
  surface: string;
  foreground: string;
  border: string;
  info: string;
  warning: string;
  income: string;
  expense: string;
}

interface AxisScale {
  min: number;
  max: number;
  step: number;
  ticks: readonly number[];
}

type FinancialState = 'REALIZED' | 'PROJECTED' | 'OVERDUE';
type FinancialDirection = 'INCOME' | 'EXPENSE';
type ViewMode = 'ALL' | 'REALIZED';

const stateLabels: Record<FinancialState, string> = {
  REALIZED: 'Realizado',
  PROJECTED: 'Projetado',
  OVERDUE: 'Vencido',
};

const directionLabels: Record<FinancialDirection, string> = {
  INCOME: 'Receita',
  EXPENSE: 'Despesa',
};

@Component({
  selector: 'gd-financial-evolution-chart',
  imports: [BaseChartDirective, LucideDynamicIcon, NgTemplateOutlet],
  templateUrl: './financial-evolution-chart.html',
  host: {
    '(document:keydown.escape)': 'handleEscape($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialEvolutionChart {
  readonly points = input.required<readonly FinancialEvolutionPoint[]>();
  readonly granularity = input.required<FinancialReportGranularity>();
  readonly granularityChange = output<FinancialReportGranularity>();

  private readonly themeStore = inject(ThemeStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly overlayStack = inject(OverlayStack);
  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly chartDirective = viewChild(BaseChartDirective);
  private readonly settingsButton = viewChild<ElementRef<HTMLButtonElement>>('settingsButton');
  private readonly settingsOnlyRealized = viewChild<ElementRef<HTMLInputElement>>('settingsOnlyRealized');
  private readonly settingsTemplate = viewChild<TemplateRef<unknown>>('settingsTemplate');
  private readonly fullscreenCloseButton = viewChild<ElementRef<HTMLButtonElement>>('fullscreenCloseButton');
  private readonly fullscreenTemplate = viewChild<TemplateRef<unknown>>('fullscreenTemplate');
  private readonly overlayId = signal<number | null>(null);
  private readonly settingsOverlayId = signal<number | null>(null);
  protected readonly settingsOpen = signal(false);
  private fullscreenOverlayRef: OverlayRef | null = null;
  private settingsOverlayRef: OverlayRef | null = null;
  private previouslyFocusedElement: HTMLElement | null = null;

  protected readonly chartType = 'bar' as const;
  protected readonly fullscreen = signal(false);
  protected readonly viewMode = signal<ViewMode>('ALL');

  protected readonly chartWidth = computed(() => {
    const width = this.points().some((point) => point.period.includes('Q'))
      ? QUARTER_WIDTH
      : MONTH_WIDTH;
    return Math.max(this.points().length * width, 520);
  });
  protected readonly scale = computed(() => this.createScale(this.points(), this.viewMode()));
  protected readonly chartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const colors = this.themeColors();
    const datasets = [
      this.barDataset(
        'Receitas realizadas',
        (point) => point.realizedIncome,
        'income',
        'INCOME',
        'REALIZED',
        colors,
      ),
      this.barDataset(
        'Receitas projetadas',
        (point) => point.projectedIncome,
        'income',
        'INCOME',
        'PROJECTED',
        colors,
      ),
      this.barDataset(
        'Receitas vencidas',
        (point) => point.overdueIncome,
        'income',
        'INCOME',
        'OVERDUE',
        colors,
      ),
      this.barDataset(
        'Despesas realizadas',
        (point) => point.realizedExpense,
        'expense',
        'EXPENSE',
        'REALIZED',
        colors,
      ),
      this.barDataset(
        'Despesas projetadas',
        (point) => point.projectedExpense,
        'expense',
        'EXPENSE',
        'PROJECTED',
        colors,
      ),
      this.barDataset(
        'Despesas vencidas',
        (point) => point.overdueExpense,
        'expense',
        'EXPENSE',
        'OVERDUE',
        colors,
      ),
    ];

    return {
      labels: this.points().map((point) => point.label),
      datasets: this.viewMode() === 'REALIZED' ? [datasets[0], datasets[3]] : datasets,
    };
  });
  protected readonly chartOptions = computed<ChartConfiguration<'bar'>['options']>(() => {
    const colors = this.themeColors();
    const scale = this.scale();

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: true, mode: 'nearest' },
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
            label: (context) =>
              this.tooltipRows(
                context.dataIndex,
                context.dataset.stack === 'expense' ? 'EXPENSE' : 'INCOME',
              ),
          },
        },
      },
      scales: {
        x: {
          position: 'bottom',
          stacked: true,
          offset: true,
          border: { display: false },
          grid: { display: false },
          ticks: {
            color: (context) =>
              this.points()[context.index]?.currentPeriod ? colors.info : colors.muted,
            padding: 10,
            maxRotation: 0,
            autoSkip: false,
          },
        },
        y: {
          position: 'left',
          stacked: true,
          beginAtZero: true,
          min: 0,
          max: scale.max,
          bounds: 'ticks',
          ticks: {
            display: true,
            stepSize: scale.step,
            maxTicksLimit: 6,
            padding: 8,
            crossAlign: 'far',
            callback: (value) => this.formatAxisCurrency(Number(value)),
          },
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

  private readonly fullscreenEffect = effect((onCleanup) => {
    if (!this.fullscreen()) {
      return;
    }

    this.previouslyFocusedElement = this.activeElement();
    const overlayId = this.overlayStack.register();
    this.overlayId.set(overlayId);
    const unlockScroll = lockOverlayScroll();
    const template = this.fullscreenTemplate();
    const overlayRef = this.overlay.create({
      positionStrategy: this.overlay
        .position()
        .global()
        .top('0')
        .left('0')
        .width('100vw')
        .height('100vh'),
      scrollStrategy: this.overlay.scrollStrategies.noop(),
      disposeOnNavigation: true,
    });

    if (template) {
      overlayRef.attach(new TemplatePortal(template, this.viewContainerRef));
    }

    this.fullscreenOverlayRef = overlayRef;

    queueMicrotask(() => {
      this.fullscreenCloseButton()?.nativeElement.focus();
      this.resizeChart();
    });

    onCleanup(() => {
      overlayRef.dispose();
      this.overlayStack.release(overlayId);
      unlockScroll();

      if (this.overlayId() === overlayId) {
        this.overlayId.set(null);
      }

      if (this.fullscreenOverlayRef === overlayRef) {
        this.fullscreenOverlayRef = null;
      }

      queueMicrotask(() => {
        this.resizeChart();
        this.previouslyFocusedElement?.focus();
      });
    });
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.closeSettingsPopover(false));

    effect(() => {
      this.themeStore.theme();
      this.chartData();
      this.chartOptions();
      queueMicrotask(() => this.resizeChart());
    });
  }

  protected setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  protected setOnlyRealized(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.setViewMode(target.checked ? 'REALIZED' : 'ALL');
  }

  protected toggleSettings(): void {
    if (this.settingsOpen()) {
      this.closeSettingsPopover(true);
      return;
    }

    const trigger = this.settingsButton();
    const template = this.settingsTemplate();
    if (!trigger || !template) {
      return;
    }

    const settingsOverlayId = this.overlayStack.register();
    const overlayRef = this.overlay.create({
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(trigger.nativeElement)
        .withPositions([
          {
            originX: 'end',
            originY: 'bottom',
            overlayX: 'end',
            overlayY: 'top',
            offsetY: 8,
          },
          {
            originX: 'end',
            originY: 'top',
            overlayX: 'end',
            overlayY: 'bottom',
            offsetY: -8,
          },
        ])
        .withFlexibleDimensions(false)
        .withPush(true),
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      panelClass: 'gd-financial-evolution-settings-pane',
    });
    overlayRef.overlayElement.style.zIndex = '1001';

    overlayRef.backdropClick().subscribe(() => this.closeSettingsPopover(false));
    overlayRef.attach(new TemplatePortal(template, this.viewContainerRef));

    this.settingsOverlayRef = overlayRef;
    this.settingsOverlayId.set(settingsOverlayId);
    this.settingsOpen.set(true);

    queueMicrotask(() => this.settingsOnlyRealized()?.nativeElement.focus());
  }

  protected selectGranularity(granularity: FinancialReportGranularity): void {
    if (this.granularity() !== granularity) {
      this.granularityChange.emit(granularity);
    }
  }

  protected toggleFullscreen(): void {
    this.closeSettingsPopover(false);
    this.fullscreen.update((value) => !value);
  }

  protected closeFullscreen(): void {
    if (this.fullscreen()) {
      this.fullscreen.set(false);
    }
  }

  protected handleEscape(event: Event): void {
    const settingsOverlayId = this.settingsOverlayId();
    if (
      this.settingsOpen() &&
      settingsOverlayId !== null &&
      !this.overlayStack.hasHandledEscape(event) &&
      this.overlayStack.isTop(settingsOverlayId)
    ) {
      event.preventDefault();
      this.overlayStack.markEscapeHandled(event);
      this.closeSettingsPopover(true);
      return;
    }

    const overlayId = this.overlayId();
    if (!this.fullscreen() || overlayId === null) {
      return;
    }

    if (this.overlayStack.hasHandledEscape(event) || !this.overlayStack.isTop(overlayId)) {
      return;
    }

    event.preventDefault();
    this.overlayStack.markEscapeHandled(event);
    this.closeFullscreen();
  }

  private closeSettingsPopover(restoreFocus: boolean): void {
    const overlayId = this.settingsOverlayId();
    this.settingsOverlayRef?.dispose();
    this.settingsOverlayRef = null;
    this.settingsOpen.set(false);

    if (overlayId !== null) {
      this.overlayStack.release(overlayId);
      this.settingsOverlayId.set(null);
    }

    if (restoreFocus) {
      queueMicrotask(() => this.settingsButton()?.nativeElement.focus());
    }
  }

  protected formatCurrency(value: number): string {
    return currencyFormatter.format(value);
  }

  protected formatAxisCurrency(value: number): string {
    return compactCurrencyFormatter.format(value);
  }

  protected totalFor(
    point: FinancialEvolutionPoint,
    direction: FinancialDirection,
    mode: ViewMode = 'ALL',
  ): number {
    const values =
      direction === 'INCOME'
        ? [point.realizedIncome, point.projectedIncome, point.overdueIncome]
        : [point.realizedExpense, point.projectedExpense, point.overdueExpense];

    return mode === 'REALIZED' ? values[0] : values.reduce((sum, value) => sum + value, 0);
  }

  protected ariaLabel(): string {
    return this.viewMode() === 'REALIZED'
      ? 'Gráfico de evolução financeira com receitas e despesas realizadas'
      : 'Gráfico de evolução financeira com receitas e despesas agrupadas por estado';
  }

  private barDataset(
    label: string,
    value: (point: FinancialEvolutionPoint) => number,
    stack: 'income' | 'expense',
    direction: FinancialDirection,
    state: FinancialState,
    colors: ChartThemeColors,
  ) {
    const baseColor = direction === 'INCOME' ? colors.income : colors.expense;
    const backgroundColor =
      state === 'REALIZED'
        ? baseColor
        : state === 'PROJECTED'
          ? this.withAlpha(baseColor, 0.42)
          : colors.warning;

    return {
      label,
      data: this.points().map(value),
      backgroundColor,
      borderColor: state === 'OVERDUE' ? colors.warning : baseColor,
      borderWidth: state === 'REALIZED' ? 0 : 1,
      barThickness: BAR_THICKNESS,
      maxBarThickness: BAR_THICKNESS,
      categoryPercentage: BAR_CATEGORY_PERCENTAGE,
      barPercentage: BAR_PERCENTAGE,
      grouped: true,
      stack,
      order: state === 'REALIZED' ? 0 : state === 'PROJECTED' ? 1 : 2,
      borderRadius: this.points().map((point) =>
        this.segmentRadius(point, direction, state),
      ),
      borderSkipped: false,
      inflateAmount: 0,
    };
  }

  private segmentRadius(
    point: FinancialEvolutionPoint,
    direction: FinancialDirection,
    state: FinancialState,
  ) {
    const values =
      direction === 'INCOME'
        ? {
            realized: point.realizedIncome,
            projected: point.projectedIncome,
            overdue: point.overdueIncome,
          }
        : {
            realized: point.realizedExpense,
            projected: point.projectedExpense,
            overdue: point.overdueExpense,
          };
    const outerState = values.overdue > 0 ? 'OVERDUE' : values.projected > 0 ? 'PROJECTED' : 'REALIZED';

    return state === outerState
      ? { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 }
      : 0;
  }

  private tooltipTitle(index: number): string {
    const point = this.points()[index];
    if (!point) return '';
    return `${point.label} · ${this.periodRange(point)}`;
  }

  private tooltipRows(index: number, direction: FinancialDirection): string[] {
    const point = this.points()[index];
    if (!point) return [];

    const values = this.stateValues(point, direction);
    const total = values.reduce((sum, value) => sum + value, 0);
    const rows = [`Tipo: ${directionLabels[direction]}`];

    if (this.viewMode() === 'REALIZED') {
      rows.push(`${stateLabels.REALIZED}: ${this.formatCurrency(values[0])}`);
    } else {
      rows.push(
        `${stateLabels.REALIZED}: ${this.formatCurrency(values[0])}`,
        `${stateLabels.PROJECTED}: ${this.formatCurrency(values[1])}`,
        `${stateLabels.OVERDUE}: ${this.formatCurrency(values[2])}`,
      );
    }

    rows.push(`Total: ${this.formatCurrency(total)}`);
    return rows;
  }

  private periodRange(point: FinancialEvolutionPoint): string {
    const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' });
    const start = formatter.format(new Date(`${point.periodStart}T00:00:00Z`));
    const end = formatter.format(new Date(`${point.periodEnd}T00:00:00Z`));
    return start === end ? start : `${start} – ${end}`;
  }

  private createScale(points: readonly FinancialEvolutionPoint[], mode: ViewMode): AxisScale {
    const values = points.flatMap((point) => [
      this.totalFor(point, 'INCOME', mode),
      this.totalFor(point, 'EXPENSE', mode),
    ]);
    const maximum = Math.max(0, ...values);
    const paddedMaximum = maximum > 0 ? maximum * 1.08 : 1;
    const step = this.niceStep(paddedMaximum / 5);
    const max = Math.max(step, Math.ceil(paddedMaximum / step) * step);
    const ticks: number[] = [];

    for (let value = max; value >= 0; value -= step) {
      ticks.push(value);
    }

    return { min: 0, max, step, ticks };
  }

  private niceStep(value: number): number {
    const safeValue = Math.max(value, 1);
    const exponent = 10 ** Math.floor(Math.log10(safeValue));
    const fraction = safeValue / exponent;
    const factor = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    return factor * exponent;
  }

  private withAlpha(color: string, alpha: number): string {
    const match = /^#([\da-f]{6})$/i.exec(color);
    if (!match) return color;

    const red = Number.parseInt(match[1].slice(0, 2), 16);
    const green = Number.parseInt(match[1].slice(2, 4), 16);
    const blue = Number.parseInt(match[1].slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
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
      warning: this.cssColor('--color-warning', '#F59E0B'),
      income: this.cssColor('--color-success', '#16A34A'),
      expense: this.cssColor('--color-danger', '#DC2626'),
    };
  }

  private cssColor(variable: string, fallback: string): string {
    if (typeof document === 'undefined') {
      return fallback;
    }

    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || fallback;
  }

  private activeElement(): HTMLElement | null {
    return typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  }

  private stateValues(
    point: FinancialEvolutionPoint,
    direction: FinancialDirection,
  ): number[] {
    const values =
      direction === 'INCOME'
        ? [point.realizedIncome, point.projectedIncome, point.overdueIncome]
        : [point.realizedExpense, point.projectedExpense, point.overdueExpense];

    return this.viewMode() === 'REALIZED' ? [values[0]] : values;
  }

  private resizeChart(): void {
    const chart = this.chartDirective()?.chart;
    chart?.resize();
    this.chartDirective()?.update();
  }
}
