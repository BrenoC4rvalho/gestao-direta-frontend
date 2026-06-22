import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { ToastMessage, ToastStore, ToastType } from '../../../core/stores/toast.store';

@Component({
  selector: 'gd-toast-container',
  imports: [LucideDynamicIcon],
  templateUrl: './toast-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainer {
  protected readonly toastStore = inject(ToastStore);
  protected readonly toasts = this.toastStore.toasts;

  protected readonly hasToasts = computed(() => this.toasts().length > 0);

  protected icon(type: ToastType): string {
    const icons: Record<ToastType, string> = {
      success: 'check',
      error: 'alert-circle',
      warning: 'alert-circle',
      info: 'alert-circle',
    };

    return icons[type];
  }

  protected remove(toast: ToastMessage): void {
    this.toastStore.remove(toast.id);
  }

  protected toastClasses(type: ToastType): string {
    const base = 'rounded-app border px-4 py-3 text-text-primary shadow-soft';
    const variants: Record<ToastType, string> = {
      success: 'border-success/30 bg-surface text-success',
      error: 'border-danger/30 bg-surface text-danger',
      warning: 'border-warning/30 bg-surface text-warning',
      info: 'border-info/30 bg-surface text-info',
    };

    return base + ' ' + variants[type];
  }
}
