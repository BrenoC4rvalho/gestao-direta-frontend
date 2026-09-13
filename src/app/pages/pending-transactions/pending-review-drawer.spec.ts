import { Component, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl, FormGroup } from '@angular/forms';
import { Subject, of } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { PendingFinancialTransaction } from '../../core/models/pending-financial-transaction.models';
import { FinancialCategoryService } from '../../core/services/financial-category.service';
import { HarvestSeasonService } from '../../core/services/harvest-season.service';
import { PendingFinancialTransactionService } from '../../core/services/pending-financial-transaction.service';
import { ToastStore } from '../../core/stores/toast.store';
import { ConfirmDialog } from '../../shared/overlays';
import { TransactionForm } from '../transactions/components/transaction-form/transaction-form';

import { PendingReviewDrawer } from './pending-review-drawer';

const pending: PendingFinancialTransaction = {
  id: 1,
  farmId: 10,
  farmName: 'Boa Safra',
  type: 'EXPENSE',
  amount: 250,
  transactionDate: '2026-07-20',
  description: 'Combustível',
  missingFields: ['categoryName'],
  categoryId: null,
  categoryName: null,
  rawCategoryName: null,
  status: 'PENDING_REVIEW',
  confidence: 0.9,
  sourceChannel: 'TELEGRAM',
  sourceMessageContent: 'Gastei 250',
  sourceMessageReceivedAt: '2026-07-20T10:00:00',
  requestedByUserId: 3,
  requestedByUserName: 'Maria',
  reviewedAt: null,
  rejectionReason: null,
};

@Component({
  imports: [PendingReviewDrawer],
  template: `<gd-pending-review-drawer
    [open]="open"
    [pendingId]="pendingId"
    (decided)="decidedCount = decidedCount + 1"
  />`,
})
class PendingReviewDrawerHost {
  open = true;
  pendingId: number | null = pending.id;
  decidedCount = 0;
}

describe('PendingReviewDrawer', () => {
  let fixture: ComponentFixture<PendingReviewDrawerHost>;
  let rejection$: Subject<PendingFinancialTransaction>;
  let rejectionCalls: Array<{ id: number; reason?: string }>;
  let toastSuccess: string[];

  beforeEach(async () => {
    rejection$ = new Subject<PendingFinancialTransaction>();
    rejectionCalls = [];
    toastSuccess = [];

    await TestBed.configureTestingModule({
      imports: [PendingReviewDrawerHost],
      providers: [
        provideGestaoDiretaIcons(),
        {
          provide: PendingFinancialTransactionService,
          useValue: {
            getById: () => of(pending),
            reject: (id: number, reason?: string) => {
              rejectionCalls.push({ id, reason });
              return rejection$;
            },
          },
        },
        { provide: FinancialCategoryService, useValue: { listByFarm: () => of([]) } },
        { provide: HarvestSeasonService, useValue: { list: () => of({ content: [] }) } },
        {
          provide: ToastStore,
          useValue: {
            success: (message: string) => toastSuccess.push(message),
            error: () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PendingReviewDrawerHost);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('configures approval confirmation with success intent and copy', () => {
    const confirmation = fixture.debugElement.query(By.directive(ConfirmDialog))
      .componentInstance as ConfirmDialog;

    expect(confirmation.variant()).toBe('success');
    expect(confirmation.confirmLabel()).toBe('Aprovar');
    expect(confirmation.description()).toBe('A movimentação será incluída no controle financeiro.');
  });

  it('closes the approval confirmation from its close button', () => {
    const drawer = fixture.debugElement.query(By.directive(PendingReviewDrawer))
      .componentInstance as unknown as { approveConfirm: WritableSignal<boolean> };
    drawer.approveConfirm.set(true);
    fixture.detectChanges();

    const closeButton = fixture.nativeElement.querySelector(
      'gd-confirm-dialog button[aria-label="Fechar confirmação"]',
    ) as HTMLButtonElement;
    closeButton.click();
    fixture.detectChanges();

    expect(drawer.approveConfirm()).toBe(false);
  });

  it('shows source data before the review form and enters rejection mode without a second dialog', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text.indexOf('Dados de origem')).toBeLessThan(text.indexOf('Descrição'));
    expect(text).toContain('Informações pendentes');
    expect(text).toContain('Categoria');

    clickButton('Rejeitar');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Rejeitar movimentação');
    expect(fixture.nativeElement.textContent).toContain('Motivo da rejeição');
    expect(document.querySelector('#gd-confirm-dialog-title')).toBeNull();
  });

  it('starts with movement data collapsed while approval and rejection actions remain available', () => {
    const toggle = movementDataToggle();
    const movementData = fixture.nativeElement.querySelector(
      '#pending-movement-data',
    ) as HTMLElement;

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(movementData.hidden).toBe(true);
    expect(buttonNamed('Rejeitar')).toBeTruthy();
    expect(buttonNamed('Aprovar')).toBeTruthy();
  });

  it('expands and collapses the movement data with the accessible toggle', () => {
    const toggle = movementDataToggle();
    const movementData = fixture.nativeElement.querySelector(
      '#pending-movement-data',
    ) as HTMLElement;

    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(movementData.hidden).toBe(false);
    expect(movementData.textContent).toContain('Descrição');

    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(movementData.hidden).toBe(true);
  });

  it('preserves form values when movement data is collapsed and expanded again', () => {
    movementDataToggle().click();
    fixture.detectChanges();
    const description = fixture.nativeElement.querySelector(
      '#transaction-description',
    ) as HTMLInputElement;
    description.value = 'Diesel para o trator';
    description.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    movementDataToggle().click();
    fixture.detectChanges();
    movementDataToggle().click();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement.querySelector('#transaction-description') as HTMLInputElement).value,
    ).toBe('Diesel para o trator');
  });

  it('approves valid data while the movement section is collapsed', () => {
    clickButton('Aprovar');
    fixture.detectChanges();

    expect(movementDataToggle().getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.textContent).toContain('Aprovar movimentação?');
  });

  it('expands movement data when approval finds validation errors', () => {
    movementDataToggle().click();
    fixture.detectChanges();
    const transactionForm = fixture.debugElement.query(By.directive(TransactionForm))
      .componentInstance as unknown as { form: FormGroup };
    transactionForm.form.get('description')?.setValue('');
    fixture.detectChanges();
    movementDataToggle().click();
    fixture.detectChanges();

    clickButton('Aprovar');
    fixture.detectChanges();

    expect(movementDataToggle().getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Informe a descrição.');
  });

  it('cancels rejection without closing the drawer', () => {
    clickButton('Rejeitar');
    fixture.detectChanges();
    clickButton('Cancelar');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Aprovar');
    expect(fixture.nativeElement.querySelector('gd-drawer')).not.toBeNull();
  });

  it('rejects once, disables actions while loading, and reports success', () => {
    clickButton('Rejeitar');
    fixture.detectChanges();
    setTextarea('Duplicada');

    const confirm = buttonNamed('Confirmar rejeição');
    confirm.click();
    confirm.click();
    fixture.detectChanges();

    expect(rejectionCalls).toEqual([{ id: pending.id, reason: 'Duplicada' }]);
    expect(confirm.disabled).toBe(true);

    rejection$.next({ ...pending, status: 'REJECTED', rejectionReason: 'Duplicada' });
    rejection$.complete();
    fixture.detectChanges();

    expect(fixture.componentInstance.decidedCount).toBe(1);
    expect(toastSuccess).toEqual(['Movimentação rejeitada com sucesso.']);
  });

  it('keeps the reason and allows a new attempt after an error', () => {
    clickButton('Rejeitar');
    fixture.detectChanges();
    setTextarea('Duplicada');
    clickButton('Confirmar rejeição');
    rejection$.error({ status: 500 });
    fixture.detectChanges();

    expect(
      (fixture.nativeElement.querySelector('#review-rejection-reason') as HTMLTextAreaElement)
        .value,
    ).toBe('Duplicada');
    expect(buttonNamed('Confirmar rejeição').disabled).toBe(false);
  });

  it('allows rejection without a reason', () => {
    clickButton('Rejeitar');
    fixture.detectChanges();
    clickButton('Confirmar rejeição');

    expect(rejectionCalls).toEqual([{ id: pending.id, reason: undefined }]);
  });

  function clickButton(label: string): void {
    buttonNamed(label).click();
  }

  function buttonNamed(label: string): HTMLButtonElement {
    return [...fixture.nativeElement.querySelectorAll('button')].find(
      (button: HTMLButtonElement) => button.textContent?.trim() === label,
    ) as HTMLButtonElement;
  }

  function movementDataToggle(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      'button[aria-controls="pending-movement-data"]',
    ) as HTMLButtonElement;
  }

  function setTextarea(value: string): void {
    const textarea = fixture.nativeElement.querySelector(
      '#review-rejection-reason',
    ) as HTMLTextAreaElement;
    textarea.value = value;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    const drawer = fixture.debugElement.query(By.directive(PendingReviewDrawer))
      .componentInstance as unknown as { rejectionReason: FormControl<string> };
    drawer.rejectionReason.setValue(value);
    fixture.detectChanges();
  }
});
