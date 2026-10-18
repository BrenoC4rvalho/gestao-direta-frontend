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
  FinancialCashFlowPoint,
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
const periodFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

interface ChartThemeColors {
  muted: string;
  grid: string;
  zeroGrid: string;
  surface: string;
  foreground: string;
  border: string;
  info: string;
  danger: string;
  expected: string;
  delayed: string;
}

interface AxisScale {
  min: number;
  max: number;
  step: number;
  ticks: readonly number[];
}

type CashFlowScenario = 'EXPECTED' | 'DELAYED';

@Component({
  selector: 'gd-financial-cash-flow-chart',
  imports: [BaseChartDirective, LucideDynamicIcon, NgTemplateOutlet],
  templateUrl: './financial-cash-flow-chart.html',
  host: {
    '(document:keydown.escape)': 'handleEscape($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialCashFlowChart {
  readonly points = input.required<readonly FinancialCashFlowPoint[]>();
  readonly granularity = input.required<FinancialReportGranularity>();
  readonly granularityChange = output<FinancialReportGranularity>();

  private readonly themeStore = inject(ThemeStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly overlayStack = inject(OverlayStack);
  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly chartDirective = viewChild(BaseChartDirective);
  private readonly settingsButton = viewChild<ElementRef<HTMLButtonElement>>('settingsButton');
  private readonly settingsMonthlyButton = viewChild<ElementRef<HTMLButtonElement>>('settingsMonthlyButton');
  private readonly settingsQuarterlyButton = viewChild<ElementRef<HTMLButtonElement>>('settingsQuarterlyButton');
  private readonly settingsTemplate = viewChild<TemplateRef<unknown>>('settingsTemplate');
  private readonly fullscreenCloseButton = viewChild<ElementRef<HTMLButtonElement>>('fullscreenCloseButton');
  private readonly fullscreenTemplate = viewChild<TemplateRef<unknown>>('fullscreenTemplate');
  private readonly fullscreenOverlayId = signal<number | null>(null);
  private readonly settingsOverlayId = signal<number | null>(null);
  private fullscreenOverlayRef: OverlayRef | null = null;
  private settingsOverlayRef: OverlayRef | null = null;
  private previouslyFocusedElement: HTMLElement | null = null;

  protected readonly chartType = 'line' as const;
  protected readonly fullscreen = signal(false);
  protected readonly settingsOpen = signal(false);
  protected readonly hasData = computed(() => this.points().length > 0);
  protected readonly chartWidth = computed(() => {
    const bucketWidth = this.points().some((point) => point.period.includes('Q')) ? 96 : 72;
    return Math.max(this.points().length * bucketWidth, 1);
  });
  protected readonly lowestPoint = computed(() => this.findLowestPoint());
  protected readonly scale = computed(() => this.createScale());
  protected readonly chartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const colors = this.themeColors();
    const points = this.points();
    const lowest = this.lowestPoint();

    return {
      labels: points.map((point) => point.label),
      datasets: [
        this.createDataset(
          'Saldo previsto',
          points.map((point) => point.expectedBalance),
          'EXPECTED',
          colors.expected,
          colors,
          lowest,
        ),
        this.createDataset(
          'Saldo com atrasos',
          points.map((point) => point.projectedBalance),
          'DELAYED',
          colors.delayed,
          colors,
          lowest,
        ),
      ],
    };
  });
  protected readonly chartOptions = computed<ChartConfiguration<'line'>['options']>(() => {
    const colors = this.themeColors();
    const scale = this.scale();

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      layout: { padding: { left: 4, right: 12, top: 8, bottom: 4 } },
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
            title: (items) => this.periodTitle(items[0]?.dataIndex ?? 0),
            label: (item) => `${item.dataset.label}: ${this.formatCurrency(item.parsed.y ?? 0)}`,
            afterBody: (items) => this.tooltipSummaryRows(items[0]?.dataIndex ?? 0),
          },
        },
      },
      scales: {
        x: {
          position: 'bottom',
          border: { display: false },
          grid: { display: false },
          ticks: {
            color: (context) =>
              this.points()[context.index]?.currentPeriod ? colors.info : colors.muted,
            autoSkip: false,
            maxRotation: 0,
            padding: 10,
          },
        },
        y: {
          min: scale.min,
          max: scale.max,
          ticks: {
            display: true,
            stepSize: scale.step,
            maxTicksLimit: 7,
            padding: 8,
            crossAlign: 'far',
            callback: (value) => this.formatAxisCurrency(Number(value)),
          },
          border: { display: false },
          grid: {
            color: (context) =>
              context.tick.value === 0 ? colors.zeroGrid : colors.grid,
            lineWidth: (context) => (context.tick.value === 0 ? 1.75 : 1),
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
    this.fullscreenOverlayId.set(overlayId);
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

      if (this.fullscreenOverlayId() === overlayId) {
        this.fullscreenOverlayId.set(null);
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
      panelClass: 'gd-financial-cash-flow-settings-pane',
    });
    overlayRef.overlayElement.style.zIndex = '1001';
    overlayRef.backdropClick().subscribe(() => this.closeSettingsPopover(false));
    overlayRef.attach(new TemplatePortal(template, this.viewContainerRef));

    this.settingsOverlayRef = overlayRef;
    this.settingsOverlayId.set(settingsOverlayId);
    this.settingsOpen.set(true);

    queueMicrotask(() => {
      const button =
        this.granularity() === 'MONTHLY'
          ? this.settingsMonthlyButton()
          : this.settingsQuarterlyButton();
      button?.nativeElement.focus();
    });
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

    const fullscreenOverlayId = this.fullscreenOverlayId();
    if (
      !this.fullscreen() ||
      fullscreenOverlayId === null ||
      this.overlayStack.hasHandledEscape(event) ||
      !this.overlayStack.isTop(fullscreenOverlayId)
    ) {
      return;
    }

    event.preventDefault();
    this.overlayStack.markEscapeHandled(event);
    this.closeFullscreen();
  }

  protected formatCurrency(value: number): string {
    return currencyFormatter.format(value);
  }

  protected formatAxisCurrency(value: number): string {
    return compactCurrencyFormatter.format(value);
  }

  private createDataset(
    label: string,
    data: readonly number[],
    scenario: CashFlowScenario,
    baseColor: string,
    colors: ChartThemeColors,
    lowest: { scenario: CashFlowScenario; index: number } | null,
  ): ChartConfiguration<'line'>['data']['datasets'][number] {
    return {
      label,
      data: [...data],
      borderColor: baseColor,
      borderDash: scenario === 'DELAYED' ? [6, 5] : [],
      borderWidth: scenario === 'DELAYED' ? 2 : 2.5,
      tension: 0.2,
      pointRadius: data.map((_, index) =>
        lowest?.scenario === scenario && lowest.index === index ? 5 : scenario === 'EXPECTED' ? 3 : 2,
      ),
      pointHoverRadius: data.map((_, index) =>
        lowest?.scenario === scenario && lowest.index === index ? 7 : 5,
      ),
      pointHitRadius: 16,
      pointBackgroundColor: data.map((value, index) =>
        this.pointColor(value, scenario, index, lowest, baseColor, colors),
      ),
      pointBorderColor: data.map((value, index) =>
        this.pointColor(value, scenario, index, lowest, baseColor, colors),
      ),
      segment: {
        borderColor: (context) =>
          (context.p0.parsed.y ?? 0) < 0 || (context.p1.parsed.y ?? 0) < 0
            ? colors.danger
            : baseColor,
      },
    };
  }

  private pointColor(
    value: number,
    scenario: CashFlowScenario,
    index: number,
    lowest: { scenario: CashFlowScenario; index: number } | null,
    baseColor: string,
    colors: ChartThemeColors,
  ): string {
    if (value < 0) {
      return colors.danger;
    }

    if (lowest?.scenario === scenario && lowest.index === index) {
      return colors.info;
    }

    return baseColor;
  }

  private createScale(): AxisScale {
    const points = this.points();
    const values = points.flatMap((point) => [point.expectedBalance, point.projectedBalance]);

    if (values.length === 0) {
      return { min: -1000, max: 1000, step: 500, ticks: [1000, 500, 0, -500, -1000] };
    }

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const magnitude = Math.max(Math.abs(minValue), Math.abs(maxValue), 1000);
    const range = Math.max(maxValue - minValue, magnitude * 0.24);
    const padding = range * 0.12;
    const lowerBound = minValue < 0 ? minValue - padding : 0;
    const upperBound = maxValue > 0 ? maxValue + padding : 0;
    const rawStep = Math.max((upperBound - lowerBound) / 5, 1);
    const step = this.niceStep(rawStep);
    const min = Math.floor(lowerBound / step) * step;
    const max = Math.ceil(upperBound / step) * step;
    const safeMin = min === max ? min - step : min;
    const safeMax = min === max ? max + step : max;
    const ticks: number[] = [];

    for (let value = safeMax; value >= safeMin; value -= step) {
      ticks.push(value);
    }

    return { min: safeMin, max: safeMax, step, ticks };
  }

  private niceStep(value: number): number {
    const safeValue = Math.max(value, 1);
    const exponent = 10 ** Math.floor(Math.log10(safeValue));
    const fraction = safeValue / exponent;
    const factor = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    return factor * exponent;
  }

  private periodTitle(index: number): string {
    const point = this.points()[index];
    if (!point) return '';

    const period = periodFormatter.format(new Date(`${point.periodStart}T00:00:00Z`));
    return `${point.label} · ${period}`;
  }

  private tooltipSummaryRows(index: number): string[] {
    const point = this.points()[index];
    if (!point) return [];

    const difference = point.expectedBalance - point.projectedBalance;
    const rows = [`Diferença: ${this.formatCurrency(difference)}`];
    const lowest = this.lowestPoint();

    if (lowest?.index === index) {
      const label = lowest.scenario === 'EXPECTED' ? 'Saldo previsto' : 'Saldo com atrasos';
      const value = lowest.scenario === 'EXPECTED' ? point.expectedBalance : point.projectedBalance;
      rows.push(`Menor saldo: ${label} (${this.formatCurrency(value)})`);
    }

    if (point.overdueIncome > 0) {
      rows.push(`Em atraso a receber: +${this.formatCurrency(point.overdueIncome)}`);
    }
    if (point.overdueExpense > 0) {
      rows.push(`Em atraso a pagar: -${this.formatCurrency(point.overdueExpense)}`);
    }

    return rows;
  }

  private findLowestPoint(): { scenario: CashFlowScenario; index: number } | null {
    let lowest: { scenario: CashFlowScenario; index: number; value: number } | null = null;

    for (const [index, point] of this.points().entries()) {
      const candidates: readonly { scenario: CashFlowScenario; value: number }[] = [
        { scenario: 'EXPECTED', value: point.expectedBalance },
        { scenario: 'DELAYED', value: point.projectedBalance },
      ];

      for (const candidate of candidates) {
        if (lowest === null || candidate.value < lowest.value) {
          lowest = { ...candidate, index };
        }
      }
    }

    return lowest ? { scenario: lowest.scenario, index: lowest.index } : null;
  }

  private themeColors(): ChartThemeColors {
    const dark = this.themeStore.isDark();
    const info = this.cssColor('--color-info', '#2563EB');

    return {
      muted: dark ? '#9CA3AF' : '#6B7280',
      grid: dark ? 'rgba(229, 231, 235, 0.12)' : 'rgba(31, 41, 55, 0.10)',
      zeroGrid: dark ? 'rgba(229, 231, 235, 0.38)' : 'rgba(31, 41, 55, 0.30)',
      surface: dark ? '#16231D' : '#FFFFFF',
      foreground: dark ? '#E5E7EB' : '#1F2937',
      border: dark ? '#263A30' : '#DDE5DD',
      info,
      danger: this.cssColor('--color-danger', '#DC2626'),
      expected: info,
      delayed: this.withAlpha(info, dark ? 0.82 : 0.7),
    };
  }

  private withAlpha(color: string, alpha: number): string {
    const match = /^#([\da-f]{6})$/i.exec(color);
    if (!match) return color;

    const red = Number.parseInt(match[1].slice(0, 2), 16);
    const green = Number.parseInt(match[1].slice(2, 4), 16);
    const blue = Number.parseInt(match[1].slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
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

  private resizeChart(): void {
    const chart = this.chartDirective()?.chart;
    chart?.resize();
    this.chartDirective()?.update();
  }
}
