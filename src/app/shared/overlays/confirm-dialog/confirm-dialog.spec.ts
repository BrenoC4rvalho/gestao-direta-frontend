import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../core/constants/lucide-icons';

import { ConfirmDialog, ConfirmDialogVariant } from './confirm-dialog';

const animationDurationMs = 200;
const frameDurationMs = 20;

@Component({
  imports: [ConfirmDialog],
  template: `
    <gd-confirm-dialog
      [open]="open()"
      title="Confirmar ação"
      description="Essa ação não poderá ser desfeita."
      confirmLabel="Confirmar"
      cancelLabel="Cancelar"
      [variant]="variant()"
      [loading]="loading()"
      (confirmed)="confirm()"
      (cancelled)="cancel()"
      (closed)="close()"
    />
  `,
})
class ConfirmDialogHost {
  readonly open = signal(false);
  readonly loading = signal(false);
  readonly variant = signal<ConfirmDialogVariant>('danger');
  confirmedCount = 0;
  cancelledCount = 0;
  closedCount = 0;

  confirm(): void {
    this.confirmedCount += 1;
  }

  cancel(): void {
    this.cancelledCount += 1;
    this.open.set(false);
  }

  close(): void {
    this.closedCount += 1;
    this.open.set(false);
  }
}

describe('ConfirmDialog', () => {
  let fixture: ComponentFixture<ConfirmDialogHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogHost],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogHost);
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
    openDialog();

    expect(fixture.nativeElement.textContent).toContain('Confirmar ação');
    expect(fixture.nativeElement.textContent).toContain('Essa ação não poderá ser desfeita.');
    expect(document.body.classList.contains('gd-overlay-open')).toBe(true);
    expect(dialog()?.getAttribute('aria-modal')).toBe('true');
    expect(panel().classList.contains('opacity-0')).toBe(true);
    expect(panel().classList.contains('scale-[0.98]')).toBe(true);
    expect(backdrop().classList.contains('opacity-0')).toBe(true);

    await completeOpeningAnimation();

    expect(panel().classList.contains('opacity-100')).toBe(true);
    expect(panel().classList.contains('scale-100')).toBe(true);
    expect(backdrop().classList.contains('opacity-100')).toBe(true);
  });

  it('should keep rendering while closing and remove after the animation duration', async () => {
    openDialog();
    await completeOpeningAnimation();

    closeButton().click();
    fixture.detectChanges();

    expect(fixture.componentInstance.closedCount).toBe(1);
    expect(dialog()).not.toBeNull();
    expect(panel().classList.contains('opacity-0')).toBe(true);
    expect(panel().classList.contains('scale-[0.98]')).toBe(true);
    expect(backdrop().classList.contains('opacity-0')).toBe(true);
    expect(document.body.classList.contains('gd-overlay-open')).toBe(true);

    await finishClosingAnimation();

    expect(dialog()).toBeNull();
    expect(document.body.classList.contains('gd-overlay-open')).toBe(false);
  });

  it('should close from backdrop click', async () => {
    openDialog();
    await completeOpeningAnimation();

    backdrop().click();
    fixture.detectChanges();

    expect(fixture.componentInstance.closedCount).toBe(1);
    expect(dialog()).not.toBeNull();

    await finishClosingAnimation();

    expect(dialog()).toBeNull();
  });

  it('should emit cancelled', async () => {
    openDialog();
    await completeOpeningAnimation();

    cancelButton().click();
    fixture.detectChanges();

    expect(fixture.componentInstance.cancelledCount).toBe(1);
    expect(dialog()).not.toBeNull();

    await finishClosingAnimation();

    expect(dialog()).toBeNull();
  });

  it('should close with Escape when open without confirming', async () => {
    openDialog();
    await completeOpeningAnimation();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.cancelledCount).toBe(1);
    expect(fixture.componentInstance.confirmedCount).toBe(0);
    expect(dialog()).not.toBeNull();

    await finishClosingAnimation();

    expect(dialog()).toBeNull();
    expect(document.body.classList.contains('gd-overlay-open')).toBe(false);
  });

  it('should ignore Escape when closed', () => {
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.cancelledCount).toBe(0);
    expect(fixture.componentInstance.confirmedCount).toBe(0);
    expect(document.body.classList.contains('gd-overlay-open')).toBe(false);
  });

  it('should emit confirmed', async () => {
    openDialog();
    await completeOpeningAnimation();

    confirmButton().click();

    expect(fixture.componentInstance.confirmedCount).toBe(1);
  });

  it('should not emit confirmed while loading', async () => {
    fixture.componentInstance.loading.set(true);
    openDialog();
    await completeOpeningAnimation();

    confirmButton().click();

    expect(fixture.componentInstance.confirmedCount).toBe(0);
  });

  it('should apply success styling to the icon, border, and confirm button', async () => {
    fixture.componentInstance.variant.set('success');
    openDialog();
    await completeOpeningAnimation();

    expect(fixture.nativeElement.querySelector('.text-success')).toBeTruthy();
    expect(panel().classList.contains('border-success/30')).toBe(true);
    expect(confirmButton().classList.contains('bg-success')).toBe(true);
    expect(cancelButton().classList.contains('border-border')).toBe(true);
  });

  it('should apply danger styling to the icon, border, and confirm button', async () => {
    openDialog();
    await completeOpeningAnimation();

    expect(fixture.nativeElement.querySelector('.text-danger')).toBeTruthy();
    expect(panel().classList.contains('border-danger/30')).toBe(true);
    expect(confirmButton().classList.contains('bg-danger')).toBe(true);
    expect(cancelButton().classList.contains('border-border')).toBe(true);
  });

  it('should include transition classes on backdrop and panel', async () => {
    openDialog();

    expect(backdrop().classList.contains('transition-opacity')).toBe(true);
    expect(backdrop().classList.contains('duration-[200ms]')).toBe(true);
    expect(panel().classList.contains('transition-[opacity,transform]')).toBe(true);
    expect(panel().classList.contains('duration-[200ms]')).toBe(true);

    await completeOpeningAnimation();
  });

  it('should keep body scroll locked during exit animation', async () => {
    openDialog();
    await completeOpeningAnimation();

    fixture.componentInstance.open.set(false);
    fixture.detectChanges();

    expect(dialog()).not.toBeNull();
    expect(document.body.classList.contains('gd-overlay-open')).toBe(true);

    await finishClosingAnimation();

    expect(dialog()).toBeNull();
    expect(document.body.classList.contains('gd-overlay-open')).toBe(false);
  });

  it('should remove body scroll lock when destroyed while open', async () => {
    openDialog();
    await completeOpeningAnimation();

    expect(document.body.classList.contains('gd-overlay-open')).toBe(true);

    fixture.destroy();

    expect(document.body.classList.contains('gd-overlay-open')).toBe(false);
  });

  function openDialog(): void {
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

  function closeButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      'button[aria-label="Fechar confirmação"]',
    ) as HTMLButtonElement;
  }

  function cancelButton(): HTMLButtonElement {
    return buttons()[1];
  }

  function confirmButton(): HTMLButtonElement {
    return buttons()[2];
  }

  function buttons(): NodeListOf<HTMLButtonElement> {
    return fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
  }
});

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
