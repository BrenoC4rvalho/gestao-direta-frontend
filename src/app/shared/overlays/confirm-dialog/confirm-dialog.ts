import { ChangeDetectionStrategy, Component, computed, effect, input, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { Button, ButtonVariant } from '../../ui';
import { lockOverlayScroll } from '../overlay-scroll-lock';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'success';

@Component({
  selector: 'gd-confirm-dialog',
  imports: [Button, LucideDynamicIcon],
  templateUrl: './confirm-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly variant = input<ConfirmDialogVariant>('danger');
  readonly loading = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
  readonly closed = output<void>();

  protected readonly titleId = 'gd-confirm-dialog-title';
  private readonly scrollLockEffect = effect((onCleanup) => {
    if (!this.open()) {
      return;
    }

    const unlock = lockOverlayScroll();
    onCleanup(unlock);
  });

  protected readonly iconClasses = computed(() =>
    [
      'flex size-11 shrink-0 items-center justify-center rounded-full',
      this.variantClasses(),
    ].join(' '),
  );

  protected readonly confirmVariant = computed<ButtonVariant>(() =>
    this.variant() === 'danger' ? 'danger' : 'primary',
  );

  protected confirm(): void {
    if (!this.loading()) {
      this.confirmed.emit();
    }
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  protected close(): void {
    this.closed.emit();
  }

  private variantClasses(): string {
    const variants: Record<ConfirmDialogVariant, string> = {
      danger: 'bg-danger/10 text-danger',
      warning: 'bg-warning/15 text-warning',
      info: 'bg-info/10 text-info',
      success: 'bg-success/10 text-success',
    };

    return variants[this.variant()];
  }
}
