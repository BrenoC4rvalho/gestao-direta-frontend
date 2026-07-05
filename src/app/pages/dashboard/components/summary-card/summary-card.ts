import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

export type SummaryCardTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

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
  readonly detail = input<string | null>(null);
  readonly icon = input.required<string>();
  readonly tone = input<SummaryCardTone>('neutral');

  protected readonly tooltipOpen = signal(false);
  protected readonly tooltipId = `gd-summary-card-tooltip-${nextTooltipId++}`;
  protected readonly hasDescription = computed(() => Boolean(this.description()));

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
}
