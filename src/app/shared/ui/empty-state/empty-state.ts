import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { Button } from '../button/button';

@Component({
  selector: 'gd-empty-state',
  imports: [Button, LucideDynamicIcon],
  templateUrl: './empty-state.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly icon = input('inbox');
  readonly actionLabel = input<string | null>(null);

  readonly action = output<void>();

  protected emitAction(): void {
    this.action.emit();
  }
}
