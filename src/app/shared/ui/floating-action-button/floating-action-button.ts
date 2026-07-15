import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

let nextTooltipId = 0;

@Component({
  selector: 'gd-floating-action-button',
  imports: [LucideDynamicIcon],
  templateUrl: './floating-action-button.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingActionButton {
  readonly icon = input('sparkles');
  readonly ariaLabel = input.required<string>();
  readonly disabled = input(false);
  readonly tooltipTitle = input.required<string>();
  readonly tooltipDescription = input.required<string>();
  readonly clicked = output<void>();

  protected readonly tooltipId = `gd-floating-action-button-tooltip-${nextTooltipId++}`;

  protected emitClick(): void {
    if (!this.disabled()) {
      this.clicked.emit();
    }
  }
}
