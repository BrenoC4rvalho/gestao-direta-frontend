import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideAlertCircle } from '@lucide/angular';

import { Button } from '../button/button';

@Component({
  selector: 'gd-error-state',
  imports: [Button, LucideAlertCircle],
  templateUrl: './error-state.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorState {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly actionLabel = input<string | null>(null);

  readonly action = output<void>();

  protected emitAction(): void {
    this.action.emit();
  }
}
