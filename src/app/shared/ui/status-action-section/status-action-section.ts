import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Button, ButtonVariant } from '../button/button';

export type StatusActionVariant = 'primary' | 'secondary' | 'danger' | 'warning' | 'success';

@Component({
  selector: 'gd-status-action-section',
  imports: [Button],
  templateUrl: './status-action-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusActionSection {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly actionLabel = input<string | null>(null);
  readonly actionVariant = input<StatusActionVariant>('primary');
  readonly actionDisabled = input(false);
  readonly actionLoading = input(false);
  readonly showAction = input(true);

  readonly action = output<void>();

  protected readonly buttonVariant = computed<ButtonVariant>(() => this.actionVariant());
  protected readonly shouldShowAction = computed(() => this.showAction() && !!this.actionLabel());

  protected emitAction(): void {
    if (!this.actionDisabled() && !this.actionLoading()) {
      this.action.emit();
    }
  }
}
