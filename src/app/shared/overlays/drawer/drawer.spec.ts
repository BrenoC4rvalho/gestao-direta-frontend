import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../core/constants/lucide-icons';

import { Drawer } from './drawer';

@Component({
  imports: [Drawer],
  template: `
    <gd-drawer
      [open]="open()"
      title="Drawer title"
      description="Drawer description"
      (closed)="close()"
    >
      Drawer content
    </gd-drawer>
  `,
})
class DrawerHost {
  readonly open = signal(false);
  closedCount = 0;

  close(): void {
    this.closedCount += 1;
    this.open.set(false);
  }
}

describe('Drawer', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.classList.remove('gd-overlay-open');
  });

  it('should not render when closed', async () => {
    await TestBed.configureTestingModule({
      imports: [DrawerHost],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(DrawerHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.classList.contains('gd-overlay-open')).toBe(false);
  });

  it('should render when open and emit closed', async () => {
    await TestBed.configureTestingModule({
      imports: [DrawerHost],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(DrawerHost);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Drawer title');
    expect(fixture.nativeElement.textContent).toContain('Drawer content');
    expect(document.body.classList.contains('gd-overlay-open')).toBe(true);

    const content = fixture.nativeElement.querySelector('.overflow-y-auto') as HTMLElement;
    expect(content.classList.contains('min-h-0')).toBe(true);
    expect(content.classList.contains('flex-1')).toBe(true);

    const closeButton = fixture.nativeElement.querySelector(
      'button[aria-label="Fechar drawer"]',
    ) as HTMLButtonElement;
    closeButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.closedCount).toBe(1);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.classList.contains('gd-overlay-open')).toBe(false);
  });

  it('should remove body scroll lock when destroyed while open', async () => {
    await TestBed.configureTestingModule({
      imports: [DrawerHost],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(DrawerHost);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    expect(document.body.classList.contains('gd-overlay-open')).toBe(true);

    fixture.destroy();

    expect(document.body.classList.contains('gd-overlay-open')).toBe(false);
  });
});
