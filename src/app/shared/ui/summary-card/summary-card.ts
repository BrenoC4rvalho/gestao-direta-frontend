import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

export type SummaryCardTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';
export type SummaryCardDensity = 'default' | 'compact';
export type SummaryCardLayout = 'default' | 'metric';
export type SummaryCardProminence = 'default' | 'primary' | 'secondary';
export type SummaryCardContentSize = 'default' | 'large';

let nextTooltipId = 0;

@Component({
  selector: 'gd-summary-card',
  imports: [LucideDynamicIcon],
  templateUrl: './summary-card.html',
  host: {
    class: 'block h-full',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryCard {
  readonly title = input.required<string>();
  readonly value = input.required<string>();
  readonly description = input<string | null>(null);
  readonly subtitle = input<string | null>(null);
  readonly meta = input<string | null>(null);
  readonly detail = input<string | null>(null);
  readonly icon = input.required<string>();
  readonly tone = input<SummaryCardTone>('neutral');
  readonly density = input<SummaryCardDensity>('default');
  readonly layout = input<SummaryCardLayout>('default');
  readonly prominence = input<SummaryCardProminence>('default');
  readonly contentSize = input<SummaryCardContentSize>('default');

  protected readonly tooltipOpen = signal(false);
  protected readonly tooltipId = `gd-summary-card-tooltip-${nextTooltipId++}`;
  protected readonly hasDescription = computed(() => Boolean(this.description()));
  protected readonly metricLayout = computed(() => this.layout() === 'metric');

  protected articleClasses(): string {
    if (this.metricLayout()) {
      return [
        'relative z-0 flex h-[176px] flex-col overflow-visible rounded-app border p-6 text-text-primary transition-all duration-200 ease-out focus-within:z-30 sm:hover:z-30 sm:hover:-translate-y-0.5 sm:hover:border-primary/25 sm:hover:shadow-md',
        this.surfaceClasses(),
      ].join(' ');
    }

    const densityClasses =
      this.density() === 'compact'
        ? 'min-h-[100px] gap-4 p-4'
        : 'min-h-[144px] gap-5 p-6';

    const contentAlignment = this.density() === 'compact' ? 'justify-start' : 'justify-between';

    return [
      'relative z-0 flex h-full flex-col overflow-visible rounded-app border text-text-primary transition-all duration-200 ease-out focus-within:z-30 sm:hover:z-30 sm:hover:-translate-y-0.5 sm:hover:border-primary/25 sm:hover:shadow-md',
      this.surfaceClasses(),
      contentAlignment,
      densityClasses,
    ].join(' ');
  }

  protected headerClasses(): string {
    return this.metricLayout()
      ? 'flex h-11 items-center justify-between gap-3'
      : 'flex items-center justify-between gap-3';
  }

  protected valueContainerClasses(): string {
    return this.metricLayout() ? 'mt-5 flex min-h-0 flex-1 flex-col' : '';
  }

  protected metaSlotClasses(): string {
    return 'mt-auto min-h-5';
  }

  protected iconClasses(): string {
    if (this.contentSize() === 'large') {
      return 'size-10';
    }

    return this.density() === 'compact' ? 'size-9' : 'size-11';
  }

  protected iconSvgClasses(): string {
    if (this.contentSize() === 'large') {
      return 'size-5';
    }

    return this.density() === 'compact' ? 'size-4' : 'size-5';
  }

  protected titleClasses(): string {
    return this.density() === 'compact'
      ? 'min-w-0 text-xs font-medium leading-4 text-text-muted'
      : 'min-w-0 pt-1 text-sm font-medium leading-5 text-text-muted';
  }

  protected tooltipButtonClasses(): string {
    return [
      'flex cursor-pointer items-center justify-center rounded-full text-text-muted transition-colors hover:bg-highlight-soft hover:text-primary focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary',
      this.density() === 'compact' ? 'size-7' : 'size-8',
    ].join(' ');
  }

  protected valueClasses(): string {
    if (this.contentSize() === 'large') {
      return 'min-w-0 break-words text-2xl font-semibold leading-tight tracking-tight text-text-primary';
    }

    if (this.prominence() === 'primary') {
      return 'break-words text-3xl font-semibold leading-tight tracking-tight text-text-primary';
    }

    if (this.prominence() === 'secondary') {
      return 'min-w-0 break-words text-xl font-semibold leading-tight text-text-primary xl:text-2xl';
    }

    return this.density() === 'compact'
      ? 'min-w-0 truncate whitespace-nowrap text-lg font-semibold leading-tight text-text-primary xl:text-xl'
      : 'break-words text-2xl font-semibold leading-tight text-text-primary';
  }

  protected metaClasses(): string {
    return this.density() === 'compact'
      ? 'mt-1 whitespace-pre-line text-xs font-medium text-text-muted'
      : 'mt-2 whitespace-pre-line text-sm font-medium text-text-muted';
  }

  protected toggleTooltip(): void {
    if (!this.hasDescription()) {
      return;
    }

    this.tooltipOpen.update((open) => !open);
  }

  protected closeTooltip(): void {
    this.tooltipOpen.set(false);
  }

  protected tooltipClasses(): string {
    const visibility = this.tooltipOpen()
      ? 'visible translate-y-0 opacity-100'
      : 'invisible translate-y-1 opacity-0 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100';

    return [
      'absolute right-0 top-10 z-50 w-64 max-w-[calc(100vw-3rem)] rounded-app border border-border bg-surface p-3 text-left text-xs leading-5 text-text-primary shadow-soft transition-all duration-150',
      visibility,
    ].join(' ');
  }

  protected toneClasses(): string {
    const tones: Record<SummaryCardTone, string> = {
      success: 'bg-success/10 text-success',
      danger: 'bg-danger/10 text-danger',
      warning: 'bg-warning/10 text-amber-700 dark:text-amber-300',
      info: 'bg-info/10 text-info',
      neutral: 'bg-highlight-soft text-primary',
    };

    return tones[this.tone()];
  }

  private surfaceClasses(): string {
    const prominences: Record<SummaryCardProminence, string> = {
      default: 'border-border bg-surface',
      primary: 'border-primary/30 border-l-4 border-l-primary bg-surface shadow-sm',
      secondary: 'border-primary/25 bg-surface shadow-sm',
    };

    return prominences[this.prominence()];
  }
}
