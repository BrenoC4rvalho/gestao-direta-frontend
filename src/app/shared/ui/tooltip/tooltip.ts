import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextTooltipId = 0;

@Component({
  selector: 'gd-tooltip',
  templateUrl: './tooltip.html',
  host: {
    class: 'group relative inline-flex overflow-visible',
    tabindex: '0',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-describedby]': 'tooltipId',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tooltip {
  readonly ariaLabel = input.required<string>();
  readonly content = input.required<string>();

  protected readonly tooltipId = `gd-tooltip-${nextTooltipId++}`;
}
