import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastState = 'entering' | 'visible' | 'leaving';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
  state: ToastState;
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
  private readonly durationTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly transitionTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly enterDurationMs = 16;
  private readonly leaveDurationMs = 250;
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
      state: 'entering',
    };

    this.messages.update((messages) => [...messages, toast]);
    this.scheduleVisibleState(id);

    if (toast.duration > 0) {
      const timer = setTimeout(() => this.remove(id), toast.duration);
      this.durationTimers.set(id, timer);
    }

    return id;
  }

  remove(id: string): void {
    const toast = this.messages().find((message) => message.id === id);

    if (!toast || toast.state === 'leaving') {
      return;
    }

    this.clearDurationTimer(id);
    this.clearTransitionTimer(id);
    this.messages.update((messages) =>
      messages.map((message) => (message.id === id ? { ...message, state: 'leaving' } : message)),
    );

    const timer = setTimeout(() => {
      this.messages.update((messages) => messages.filter((message) => message.id !== id));
      this.transitionTimers.delete(id);
    }, this.leaveDurationMs);
    this.transitionTimers.set(id, timer);
  }

  clear(): void {
    for (const timer of this.durationTimers.values()) {
      clearTimeout(timer);
    }

    for (const timer of this.transitionTimers.values()) {
      clearTimeout(timer);
    }

    this.durationTimers.clear();
    this.transitionTimers.clear();
    this.messages.set([]);
  }

  private scheduleVisibleState(id: string): void {
    const timer = setTimeout(() => {
      this.messages.update((messages) =>
        messages.map((message) =>
          message.id === id && message.state === 'entering'
            ? { ...message, state: 'visible' }
            : message,
        ),
      );
      this.transitionTimers.delete(id);
    }, this.enterDurationMs);

    this.transitionTimers.set(id, timer);
  }

  private clearDurationTimer(id: string): void {
    const timer = this.durationTimers.get(id);

    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.durationTimers.delete(id);
  }

  private clearTransitionTimer(id: string): void {
    const timer = this.transitionTimers.get(id);

    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.transitionTimers.delete(id);
  }
}
