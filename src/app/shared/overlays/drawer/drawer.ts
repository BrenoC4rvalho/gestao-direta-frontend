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

import { lockOverlayScroll } from '../overlay-scroll-lock';
import { OverlayStack } from '../overlay-stack';

export type DrawerPosition = 'right' | 'bottom';
export type DrawerSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'gd-drawer',
  imports: [LucideDynamicIcon],
  templateUrl: './drawer.html',
  host: {
    '(document:keydown.escape)': 'handleEscape($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Drawer {
  private readonly overlayStack = inject(OverlayStack);
  private readonly overlayId = signal<number | null>(null);
  private readonly animationDurationMs = 250;
  private readonly animationDurationClass = 'duration-[250ms]';
  private visibilityFrameId: number | ReturnType<typeof setTimeout> | null = null;
  private visibilityFrameUsesTimeout = false;
  private closeTimeoutId: ReturnType<typeof setTimeout> | null = null;
  readonly open = input(false);
  readonly title = input<string | null>(null);
  readonly description = input<string | null>(null);
  readonly position = input<DrawerPosition>('right');
  readonly size = input<DrawerSize>('md');
  readonly closeOnBackdrop = input(true);
  readonly showCloseButton = input(true);

  readonly closed = output<void>();

  protected readonly rendered = signal(false);
  protected readonly visible = signal(false);
  protected readonly titleId = computed(() => (this.title() ? 'gd-drawer-title' : null));
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
      this.closeOnBackdrop() ? 'cursor-pointer' : 'cursor-default',
      this.animationDurationClass,
      this.visible() ? 'opacity-100' : 'opacity-0',
    ].join(' '),
  );

  protected readonly panelClasses = computed(() =>
    [
      'fixed z-50 flex flex-col overflow-hidden bg-surface text-text-primary shadow-soft',
      'transition-transform ease-out will-change-transform',
      this.animationDurationClass,
      this.positionClasses(),
      this.sizeClasses(),
      this.transformClasses(),
    ].join(' '),
  );

  protected closeFromBackdrop(): void {
    if (this.closeOnBackdrop()) {
      this.close();
    }
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
    this.close();
  }

  private positionClasses(): string {
    if (this.position() === 'bottom') {
      return 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-app border-t border-border';
    }

    return 'inset-y-0 right-0 h-dvh w-[calc(100vw-2rem)] max-w-full border-l border-border sm:w-full';
  }

  private sizeClasses(): string {
    if (this.position() === 'bottom') {
      const sizes: Record<DrawerSize, string> = {
        sm: 'sm:mx-auto sm:max-w-md',
        md: 'sm:mx-auto sm:max-w-2xl',
        lg: 'sm:mx-auto sm:max-w-4xl',
      };

      return sizes[this.size()];
    }

    const sizes: Record<DrawerSize, string> = {
      sm: 'sm:max-w-sm',
      md: 'sm:max-w-lg',
      lg: 'sm:max-w-2xl',
    };

    return sizes[this.size()];
  }

  private transformClasses(): string {
    if (this.visible()) {
      return this.position() === 'bottom' ? 'translate-y-0' : 'translate-x-0';
    }

    return this.position() === 'bottom' ? 'translate-y-full' : 'translate-x-full';
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
}
