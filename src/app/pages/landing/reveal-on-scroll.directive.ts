import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  Directive,
  DestroyRef,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';

@Directive({
  selector: '[gdRevealOnScroll]',
  host: {
    class: 'gd-reveal',
    '[class.gd-reveal--ready]': 'ready()',
    '[class.gd-reveal--visible]': 'visible()',
  },
})
export class RevealOnScrollDirective {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly ready = signal(false);
  protected readonly visible = signal(false);

  constructor() {
    afterNextRender(() => this.observe());
  }

  private observe(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.visible.set(true);
      return;
    }

    const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      this.visible.set(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        this.visible.set(true);
        observer.disconnect();
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    this.ready.set(true);
    observer.observe(this.element.nativeElement);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
