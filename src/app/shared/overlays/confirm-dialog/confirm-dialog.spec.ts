import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../core/constants/lucide-icons';

import { ConfirmDialog } from './confirm-dialog';

@Component({
  imports: [ConfirmDialog],
  template: `
    <gd-confirm-dialog
      [open]="open()"
      title="Confirmar ação"
      description="Essa ação não poderá ser desfeita."
      confirmLabel="Confirmar"
      cancelLabel="Cancelar"
      [variant]="variant"
      [loading]="loading"
      (confirmed)="confirmedCount = confirmedCount + 1"
      (cancelled)="cancelledCount = cancelledCount + 1"
    />
  `,
})
class ConfirmDialogHost {
  readonly open = signal(true);
  loading = false;
  variant: 'danger' | 'success' = 'danger';
  confirmedCount = 0;
  cancelledCount = 0;
}

describe('ConfirmDialog', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.classList.remove('gd-overlay-open');
  });
  it('should render when open and emit confirmed', async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogHost],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(ConfirmDialogHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Confirmar ação');

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    buttons[2].click();

    expect(fixture.componentInstance.confirmedCount).toBe(1);
  });

  it('should emit cancelled', async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogHost],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(ConfirmDialogHost);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    buttons[1].click();

    expect(fixture.componentInstance.cancelledCount).toBe(1);
  });

  it('should support success variant', async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogHost],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(ConfirmDialogHost);
    fixture.componentInstance.variant = 'success';
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Confirmar ação');
    expect(fixture.nativeElement.querySelector('.text-success')).toBeTruthy();
  });

  it('should not emit confirmed while loading', async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogHost],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(ConfirmDialogHost);
    fixture.componentInstance.loading = true;
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    buttons[2].click();

    expect(fixture.componentInstance.confirmedCount).toBe(0);
  });

  it('should toggle body scroll lock with open state', async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogHost],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(ConfirmDialogHost);
    fixture.detectChanges();

    expect(document.body.classList.contains('gd-overlay-open')).toBe(true);

    fixture.componentInstance.open.set(false);
    fixture.detectChanges();

    expect(document.body.classList.contains('gd-overlay-open')).toBe(false);
  });

  it('should remove body scroll lock when destroyed while open', async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogHost],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(ConfirmDialogHost);
    fixture.detectChanges();

    expect(document.body.classList.contains('gd-overlay-open')).toBe(true);

    fixture.destroy();

    expect(document.body.classList.contains('gd-overlay-open')).toBe(false);
  });
});
