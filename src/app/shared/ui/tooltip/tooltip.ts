import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

let nextTooltipId = 0;

type TooltipWidth = 'auto' | 'narrow';

@Component({
  selector: 'gd-tooltip',
  templateUrl: './tooltip.html',
  host: {
    class: 'group relative inline-flex overflow-visible hover:z-[1000] focus-within:z-[1000]',
    tabindex: '0',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-describedby]': 'tooltipId',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tooltip {
  readonly ariaLabel = input.required<string>();
  readonly content = input.required<string>();
  readonly width = input<TooltipWidth>('auto');

  protected readonly tooltipId = `gd-tooltip-${nextTooltipId++}`;
  protected readonly tooltipClasses = computed(() => [
    'pointer-events-none invisible absolute bottom-full left-1/2 z-[1000] mb-2 -translate-x-1/2 rounded-app border border-border bg-surface px-3 py-2 text-center text-xs font-medium leading-5 text-text-primary opacity-0 shadow-soft transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100',
    this.width() === 'narrow'
      ? 'w-64 max-w-[calc(100vw-2rem)] whitespace-normal'
      : 'w-max max-w-[calc(100vw-2rem)] whitespace-pre-line',
  ].join(' '));
}
