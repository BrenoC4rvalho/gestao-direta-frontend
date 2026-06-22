import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
}

export interface ToastOptions {
  description?: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastStore {
  private readonly messages = signal<readonly ToastMessage[]>([]);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private nextId = 0;

  readonly toasts = this.messages.asReadonly();

  success(title: string, description?: string, duration = 5000): string {
    return this.add('success', title, { description, duration });
  }

  error(title: string, description?: string, duration = 5000): string {
    return this.add('error', title, { description, duration });
  }

  warning(title: string, description?: string, duration = 5000): string {
    return this.add('warning', title, { description, duration });
  }

  info(title: string, description?: string, duration = 5000): string {
    return this.add('info', title, { description, duration });
  }

  add(type: ToastType, title: string, options: ToastOptions = {}): string {
    const id = `toast-${++this.nextId}`;
    const toast: ToastMessage = {
      id,
      type,
      title,
      description: options.description,
      duration: options.duration ?? 5000,
    };

    this.messages.update((messages) => [...messages, toast]);

    if (toast.duration > 0) {
      const timer = setTimeout(() => this.remove(id), toast.duration);
      this.timers.set(id, timer);
    }

    return id;
  }

  remove(id: string): void {
    const timer = this.timers.get(id);

    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this.messages.update((messages) => messages.filter((toast) => toast.id !== id));
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.timers.clear();
    this.messages.set([]);
  }
}
