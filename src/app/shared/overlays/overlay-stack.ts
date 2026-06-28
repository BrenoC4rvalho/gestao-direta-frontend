import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class OverlayStack {
  private readonly stack: number[] = [];
  private readonly handledEscapeEvents = new WeakSet<Event>();
  private nextId = 0;

  register(): number {
    const overlayId = ++this.nextId;
    this.stack.push(overlayId);
    return overlayId;
  }

  release(overlayId: number): void {
    const index = this.stack.lastIndexOf(overlayId);

    if (index === -1) {
      return;
    }

    this.stack.splice(index, 1);
  }

  isTop(overlayId: number): boolean {
    return this.stack[this.stack.length - 1] === overlayId;
  }

  hasHandledEscape(event: Event): boolean {
    return this.handledEscapeEvents.has(event);
  }

  markEscapeHandled(event: Event): void {
    this.handledEscapeEvents.add(event);
  }
}
