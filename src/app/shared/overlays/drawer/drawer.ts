import { ChangeDetectionStrategy, Component, computed, effect, input, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { lockOverlayScroll } from '../overlay-scroll-lock';

export type DrawerPosition = 'right' | 'bottom';
export type DrawerSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'gd-drawer',
  imports: [LucideDynamicIcon],
  templateUrl: './drawer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Drawer {
  readonly open = input(false);
  readonly title = input<string | null>(null);
  readonly description = input<string | null>(null);
  readonly position = input<DrawerPosition>('right');
  readonly size = input<DrawerSize>('md');
  readonly closeOnBackdrop = input(true);
  readonly showCloseButton = input(true);

  readonly closed = output<void>();

  protected readonly titleId = computed(() => (this.title() ? 'gd-drawer-title' : null));
  private readonly scrollLockEffect = effect((onCleanup) => {
    if (!this.open()) {
      return;
    }

    const unlock = lockOverlayScroll();
    onCleanup(unlock);
  });

  protected readonly panelClasses = computed(() =>
    [
      'fixed z-50 flex flex-col overflow-hidden bg-surface text-text-primary shadow-soft',
      'transition-transform duration-200 ease-out',
      this.positionClasses(),
      this.sizeClasses(),
    ].join(' '),
  );

  protected closeFromBackdrop(): void {
    if (this.closeOnBackdrop()) {
      this.close();
    }
  }

  protected close(): void {
    this.closed.emit();
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
}
