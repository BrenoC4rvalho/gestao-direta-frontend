import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { Button, ButtonVariant } from '../../ui';
import { lockOverlayScroll } from '../overlay-scroll-lock';
import { OverlayStack } from '../overlay-stack';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'success';

@Component({
  selector: 'gd-confirm-dialog',
  imports: [Button, LucideDynamicIcon],
  templateUrl: './confirm-dialog.html',
  host: {
    '(document:keydown.escape)': 'handleEscape($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  private readonly overlayStack = inject(OverlayStack);
  private readonly overlayId = signal<number | null>(null);
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
  private readonly overlayRegistrationEffect = effect((onCleanup) => {
    if (!this.open()) {
      return;
    }

    const overlayId = this.overlayStack.register();
    this.overlayId.set(overlayId);
    onCleanup(() => {
      this.overlayStack.release(overlayId);

      if (this.overlayId() === overlayId) {
        this.overlayId.set(null);
      }
    });
  });
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

  protected handleEscape(event: Event): void {
    const overlayId = this.overlayId();

    if (!this.open() || overlayId === null || this.overlayStack.hasHandledEscape(event) || !this.overlayStack.isTop(overlayId)) {
      return;
    }

    this.overlayStack.markEscapeHandled(event);
    this.cancel();
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
