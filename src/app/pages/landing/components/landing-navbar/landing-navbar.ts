import { DOCUMENT, NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { fromEvent } from 'rxjs';

interface LandingNavItem {
  readonly label: string;
  readonly href: string;
}

@Component({
  selector: 'gd-landing-navbar',
  imports: [LucideDynamicIcon, NgOptimizedImage, RouterLink],
  templateUrl: './landing-navbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingNavbar {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');

  protected readonly menuOpen = signal(false);
  protected readonly scrolled = signal(false);
  protected readonly navItems: readonly LandingNavItem[] = [
    { label: 'Início', href: '#inicio' },
    { label: 'Como funciona', href: '#como-funciona' },
    { label: 'Funcionalidades', href: '#funcionalidades' },
    { label: 'Safras', href: '#safras' },
    { label: 'Inteligência Artificial', href: '#inteligencia-artificial' },
    { label: 'Relatórios', href: '#relatorios' },
  ];

  constructor() {
    afterNextRender(() => {
      const window = this.document.defaultView;
      if (!window) return;

      this.scrolled.set(window.scrollY > 8);
      fromEvent(window, 'scroll')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.scrolled.set(window.scrollY > 8));
    });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected handleMenuKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !this.menuOpen()) return;
    event.preventDefault();
    this.closeMenu();
    this.menuButton()?.nativeElement.focus();
  }
}
