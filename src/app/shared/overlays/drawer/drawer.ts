import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
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

export type DrawerPosition = 'right' | 'bottom' | 'center';
export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'gd-drawer',
  imports: [LucideDynamicIcon],
  templateUrl: './drawer.html',
  host: {
    '(document:keydown.escape)': 'handleEscape($event)',
    '(document:keydown.tab)': 'handleTab($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Drawer {
  private readonly overlayStack = inject(OverlayStack);
  private readonly overlayId = signal<number | null>(null);
  private readonly animationDurationMs = 250;
  private readonly animationDurationClass = 'duration-[250ms]';
  private previouslyFocusedElement: HTMLElement | null = null;
  private visibilityFrameId: number | ReturnType<typeof setTimeout> | null = null;
  private visibilityFrameUsesTimeout = false;
  private closeTimeoutId: ReturnType<typeof setTimeout> | null = null;
  readonly open = input(false);
  readonly title = input<string | null>(null);
  readonly description = input<string | null>(null);
  readonly position = input<DrawerPosition>('right');
  readonly size = input<DrawerSize>('md');
  readonly reserveScrollbarGutter = input(false);
  readonly closeOnBackdrop = input(true);
  readonly showCloseButton = input(true);

  readonly closed = output<void>();

  protected readonly rendered = signal(false);
  protected readonly visible = signal(false);
  protected readonly titleId = computed(() => (this.title() ? 'gd-drawer-title' : null));
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
  protected readonly scrollViewportClasses = computed(() =>
    [
      'min-h-0 flex-1 overflow-y-auto',
      this.reserveScrollbarGutter() ? '[scrollbar-gutter:stable]' : '',
    ].join(' '),
  );
  protected readonly scrollContentClasses = computed(() =>
    [
      'min-w-0',
      this.reserveScrollbarGutter() ? 'px-4 py-4 pb-6 sm:px-5' : 'px-5 py-4',
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

  private positionClasses(): string {
    if (this.position() === 'center') {
      return 'left-1/2 top-1/2 w-[calc(100vw-2rem)] max-h-[85dvh] -translate-x-1/2 rounded-app border border-border';
    }

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
        xl: 'sm:mx-auto sm:max-w-6xl',
      };

      return sizes[this.size()];
    }

    const sizes: Record<DrawerSize, string> = {
      sm: 'sm:max-w-sm',
      md: 'sm:max-w-lg',
      lg: 'sm:max-w-2xl',
      xl: this.position() === 'center' ? 'max-w-6xl' : 'sm:max-w-4xl',
    };

    return sizes[this.size()];
  }

  private transformClasses(): string {
    if (this.position() === 'center') {
      return this.visible()
        ? '-translate-x-1/2 -translate-y-1/2 scale-100 opacity-100'
        : '-translate-x-1/2 -translate-y-[46%] scale-[0.98] opacity-0';
    }

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
