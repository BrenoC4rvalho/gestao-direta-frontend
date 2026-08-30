import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../core/constants/lucide-icons';

import { Drawer, DrawerPosition, DrawerSize } from './drawer';

const animationDurationMs = 250;
const frameDurationMs = 20;

@Component({
  imports: [Drawer],
  template: `
    <gd-drawer
      [open]="open()"
      title="Drawer title"
      description="Drawer description"
      [position]="position()"
      [size]="size()"
      [reserveScrollbarGutter]="reserveScrollbarGutter()"
      (closed)="close()"
    >
      Drawer content
    </gd-drawer>
  `,
})
class DrawerHost {
  readonly open = signal(false);
  readonly position = signal<DrawerPosition>('right');
  readonly size = signal<DrawerSize>('md');
  readonly reserveScrollbarGutter = signal(false);
  closedCount = 0;

  close(): void {
    this.closedCount += 1;
    this.open.set(false);
  }
}

describe('Drawer', () => {
  let fixture: ComponentFixture<DrawerHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrawerHost],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    fixture = TestBed.createComponent(DrawerHost);
  });

  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
    document.body.classList.remove('gd-overlay-open');
  });

  it('should not render when closed', () => {
    fixture.detectChanges();

    expect(dialog()).toBeNull();
    expect(document.body.classList.contains('gd-overlay-open')).toBe(false);
  });

  it('should render when open and apply visible state after the next frame', async () => {
    openDrawer();

    expect(fixture.nativeElement.textContent).toContain('Drawer title');
    expect(fixture.nativeElement.textContent).toContain('Drawer content');
    expect(document.body.classList.contains('gd-overlay-open')).toBe(true);

    const content = fixture.nativeElement.querySelector('.overflow-y-auto') as HTMLElement;
    expect(content.classList.contains('min-h-0')).toBe(true);
    expect(content.classList.contains('flex-1')).toBe(true);

    expect(panel().classList.contains('translate-x-full')).toBe(true);
    expect(backdrop().classList.contains('opacity-0')).toBe(true);

    await completeOpeningAnimation();

    expect(panel().classList.contains('translate-x-0')).toBe(true);
    expect(backdrop().classList.contains('opacity-100')).toBe(true);
  });

  it('should keep rendering while closing and remove after the animation duration', async () => {
    openDrawer();
    await completeOpeningAnimation();

    const closeButton = fixture.nativeElement.querySelector(
      'button[aria-label="Fechar drawer"]',
    ) as HTMLButtonElement;
    closeButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.closedCount).toBe(1);
    expect(dialog()).not.toBeNull();
    expect(panel().classList.contains('translate-x-full')).toBe(true);
    expect(backdrop().classList.contains('opacity-0')).toBe(true);
    expect(document.body.classList.contains('gd-overlay-open')).toBe(true);

    await finishClosingAnimation();

    expect(dialog()).toBeNull();
    expect(document.body.classList.contains('gd-overlay-open')).toBe(false);
  });

  it('should close from backdrop click', async () => {
    openDrawer();
    await completeOpeningAnimation();

    backdrop().click();
    fixture.detectChanges();

    expect(fixture.componentInstance.closedCount).toBe(1);
    expect(dialog()).not.toBeNull();

    await finishClosingAnimation();

    expect(dialog()).toBeNull();
  });

  it('should close with Escape when open', async () => {
    openDrawer();
    await completeOpeningAnimation();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.closedCount).toBe(1);
    expect(dialog()).not.toBeNull();

    await finishClosingAnimation();

    expect(dialog()).toBeNull();
    expect(document.body.classList.contains('gd-overlay-open')).toBe(false);
  });

  it('should ignore Escape when closed', () => {
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.closedCount).toBe(0);
    expect(document.body.classList.contains('gd-overlay-open')).toBe(false);
  });

  it('should include transition classes on backdrop and panel', async () => {
    openDrawer();

    expect(backdrop().classList.contains('transition-opacity')).toBe(true);
    expect(backdrop().classList.contains('duration-[250ms]')).toBe(true);
    expect(panel().classList.contains('transition-transform')).toBe(true);
    expect(panel().classList.contains('duration-[250ms]')).toBe(true);

    await completeOpeningAnimation();
  });

  it('should animate bottom drawers vertically', async () => {
    fixture.componentInstance.position.set('bottom');
    openDrawer();

    expect(panel().classList.contains('translate-y-full')).toBe(true);

    await completeOpeningAnimation();

    expect(panel().classList.contains('translate-y-0')).toBe(true);

    fixture.componentInstance.open.set(false);
    fixture.detectChanges();

    expect(panel().classList.contains('translate-y-full')).toBe(true);

    await finishClosingAnimation();

    expect(dialog()).toBeNull();
  });

  it('should render a centered extra-large drawer within the viewport', async () => {
    fixture.componentInstance.position.set('center');
    fixture.componentInstance.size.set('xl');
    openDrawer();

    expect(panel().classList.contains('left-1/2')).toBe(true);
    expect(panel().classList.contains('top-1/2')).toBe(true);
    expect(panel().classList.contains('max-h-[85dvh]')).toBe(true);
    expect(panel().classList.contains('max-w-6xl')).toBe(true);

    await completeOpeningAnimation();

    expect(panel().classList.contains('-translate-x-1/2')).toBe(true);
    expect(panel().classList.contains('-translate-y-1/2')).toBe(true);
  });

  it('should reserve scrollbar space only when requested', () => {
    fixture.componentInstance.reserveScrollbarGutter.set(true);
    openDrawer();

    const viewport = fixture.nativeElement.querySelector('.overflow-y-auto') as HTMLElement;
    const content = viewport.firstElementChild as HTMLElement;

    expect(viewport.classList.contains('[scrollbar-gutter:stable]')).toBe(true);
    expect(viewport.classList.contains('min-h-0')).toBe(true);
    expect(content.classList.contains('overflow-y-auto')).toBe(false);
    expect(content.classList.contains('min-w-0')).toBe(true);
    expect(content.classList.contains('px-4')).toBe(true);
    expect(content.classList.contains('pb-6')).toBe(true);
    expect(content.classList.contains('sm:px-5')).toBe(true);
  });

  it('should remove body scroll lock when destroyed while open', async () => {
    openDrawer();
    await completeOpeningAnimation();

    expect(document.body.classList.contains('gd-overlay-open')).toBe(true);

    fixture.destroy();

    expect(document.body.classList.contains('gd-overlay-open')).toBe(false);
  });

  function openDrawer(): void {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
  }

  async function completeOpeningAnimation(): Promise<void> {
    await wait(frameDurationMs);
    fixture.detectChanges();
  }

  async function finishClosingAnimation(): Promise<void> {
    await wait(animationDurationMs + 10);
    fixture.detectChanges();
  }

  function dialog(): HTMLElement | null {
    return fixture.nativeElement.querySelector('[role="dialog"]');
  }

  function panel(): HTMLElement {
    return fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
  }

  function backdrop(): HTMLElement {
    return fixture.nativeElement.querySelector('div[aria-hidden="true"]') as HTMLElement;
  }
});

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
