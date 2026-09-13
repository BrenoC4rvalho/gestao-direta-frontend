import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { lockOverlayScroll } from '../overlay-scroll-lock';
import { OverlayStack } from '../overlay-stack';

export type DialogSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'gd-dialog',
  imports: [LucideDynamicIcon],
  templateUrl: './dialog.html',
  host: {
    '(document:keydown.escape)': 'handleEscape($event)',
    '(document:keydown.tab)': 'handleTab($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dialog {
  private readonly overlayStack = inject(OverlayStack);
  private readonly overlayId = signal<number | null>(null);
  private readonly animationDurationMs = 200;
  private readonly animationDurationClass = 'duration-[200ms]';
  private previouslyFocusedElement: HTMLElement | null = null;
  private visibilityFrameId: number | ReturnType<typeof setTimeout> | null = null;
  private visibilityFrameUsesTimeout = false;
  private closeTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly open = input(false);
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly size = input<DialogSize>('md');
  readonly closed = output<void>();

  protected readonly rendered = signal(false);
  protected readonly visible = signal(false);
  protected readonly titleId = `gd-dialog-title-${Math.random().toString(36).slice(2)}`;
  private readonly panelElement = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly closeButtonElement = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private readonly renderStateEffect = effect((onCleanup) => {
    if (this.open()) {
      if (!untracked(() => this.rendered())) {
        this.previouslyFocusedElement = this.activeElement();
      }

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
      this.restoreFocus();
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
  private readonly initialFocusEffect = effect(() => {
    if (!this.open() || !this.rendered()) {
      return;
    }

    const closeButton = this.closeButtonElement()?.nativeElement;
    if (!closeButton) {
      return;
    }

    queueMicrotask(() => {
      if (this.open() && closeButton.isConnected) {
        closeButton.focus();
      }
    });
  });

  protected readonly backdropClasses = computed(() =>
    [
      'fixed inset-0 z-40 cursor-pointer bg-black/45 transition-opacity ease-out',
      this.animationDurationClass,
      this.visible() ? 'opacity-100' : 'opacity-0',
    ].join(' '),
  );
  protected readonly panelClasses = computed(() =>
    [
      'fixed left-1/2 top-1/2 z-50 flex w-[calc(100vw-2rem)] max-h-[85dvh] -translate-x-1/2 flex-col overflow-hidden rounded-app border border-border bg-surface text-text-primary shadow-soft transition-[opacity,transform] ease-out will-change-transform',
      this.sizeClasses(),
      this.animationDurationClass,
      this.visible()
        ? '-translate-y-1/2 scale-100 opacity-100'
        : '-translate-y-[46%] scale-[0.98] opacity-0',
    ].join(' '),
  );

  protected close(): void {
    if (this.open()) {
      this.closed.emit();
    }
  }

  protected handleEscape(event: Event): void {
    const overlayId = this.overlayId();
    if (
      !this.open() ||
      overlayId === null ||
      this.overlayStack.hasHandledEscape(event) ||
      !this.overlayStack.isTop(overlayId)
    ) {
      return;
    }

    this.overlayStack.markEscapeHandled(event);
    this.close();
  }

  protected handleTab(event: Event): void {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }

    const overlayId = this.overlayId();
    const panel = this.panelElement()?.nativeElement;
    if (!this.open() || overlayId === null || !this.overlayStack.isTop(overlayId) || !panel) {
      return;
    }

    const focusableElements = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute('hidden'));
    if (focusableElements.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }

    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];
    const activeElement = this.activeElement();
    if (event.shiftKey && (activeElement === firstFocusableElement || !panel.contains(activeElement))) {
      event.preventDefault();
      lastFocusableElement.focus();
      return;
    }

    if (!event.shiftKey && activeElement === lastFocusableElement) {
      event.preventDefault();
      firstFocusableElement.focus();
    }
  }

  private sizeClasses(): string {
    const sizes: Record<DialogSize, string> = {
      sm: 'max-w-sm',
      md: 'max-w-2xl',
      lg: 'max-w-4xl',
    };
    return sizes[this.size()];
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
    if (this.closeTimeoutId !== null) {
      clearTimeout(this.closeTimeoutId);
      this.closeTimeoutId = null;
    }
  }

  private activeElement(): HTMLElement | null {
    return document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  private restoreFocus(): void {
    if (this.previouslyFocusedElement?.isConnected) {
      this.previouslyFocusedElement.focus();
    }
    this.previouslyFocusedElement = null;
  }
}
