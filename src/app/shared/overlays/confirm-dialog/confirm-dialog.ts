import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
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
  private readonly animationDurationMs = 200;
  private readonly animationDurationClass = 'duration-[200ms]';
  private visibilityFrameId: number | ReturnType<typeof setTimeout> | null = null;
  private visibilityFrameUsesTimeout = false;
  private closeTimeoutId: ReturnType<typeof setTimeout> | null = null;
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
  protected readonly rendered = signal(false);
  protected readonly visible = signal(false);
  private readonly renderStateEffect = effect((onCleanup) => {
    if (this.open()) {
      this.clearCloseTimeout();
      this.rendered.set(true);
      this.scheduleVisibleState();
      onCleanup(() => this.clearVisibilityFrame());
      return;
    }

    this.clearVisibilityFrame();
    this.visible.set(false);

    if (!untracked(() => this.rendered())) {
      return;
    }

    this.clearCloseTimeout();
    this.closeTimeoutId = setTimeout(() => {
      this.rendered.set(false);
      this.closeTimeoutId = null;
    }, this.animationDurationMs);

    onCleanup(() => this.clearCloseTimeout());
  });
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
    if (!this.rendered()) {
      return;
    }

    const unlock = lockOverlayScroll();
    onCleanup(unlock);
  });

  protected readonly backdropClasses = computed(() =>
    [
      'fixed inset-0 z-40 bg-black/45 transition-opacity ease-out',
      this.animationDurationClass,
      this.visible() ? 'opacity-100' : 'opacity-0',
    ].join(' '),
  );

  protected readonly panelClasses = computed(() =>
    [
      'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 rounded-app border border-border bg-surface p-5 text-text-primary shadow-soft',
      'transition-[opacity,transform] ease-out will-change-transform',
      this.animationDurationClass,
      this.visible() ? '-translate-y-1/2 scale-100 opacity-100' : '-translate-y-[46%] scale-[0.98] opacity-0',
    ].join(' '),
  );

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
    if (this.open() && !this.loading()) {
      this.confirmed.emit();
    }
  }

  protected cancel(): void {
    if (!this.open()) {
      return;
    }

    this.cancelled.emit();
  }

  protected close(): void {
    if (!this.open()) {
      return;
    }

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

  private scheduleVisibleState(): void {
    this.clearVisibilityFrame();

    if (typeof requestAnimationFrame === 'function') {
      this.visibilityFrameUsesTimeout = false;
      this.visibilityFrameId = requestAnimationFrame(() => {
        this.visible.set(true);
        this.visibilityFrameId = null;
      });
      return;
    }

    this.visibilityFrameUsesTimeout = true;
    this.visibilityFrameId = setTimeout(() => {
      this.visible.set(true);
      this.visibilityFrameId = null;
      this.visibilityFrameUsesTimeout = false;
    }, 16);
  }

  private clearVisibilityFrame(): void {
    if (this.visibilityFrameId === null) {
      return;
    }

    if (this.visibilityFrameUsesTimeout) {
      clearTimeout(this.visibilityFrameId as ReturnType<typeof setTimeout>);
    } else {
      cancelAnimationFrame(this.visibilityFrameId as number);
    }

    this.visibilityFrameId = null;
    this.visibilityFrameUsesTimeout = false;
  }

  private clearCloseTimeout(): void {
    if (this.closeTimeoutId === null) {
      return;
    }

    clearTimeout(this.closeTimeoutId);
    this.closeTimeoutId = null;
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
