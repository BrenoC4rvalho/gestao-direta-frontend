import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl } from '@angular/forms';
import { Subject, of } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { PendingFinancialTransaction } from '../../core/models/pending-financial-transaction.models';
import { FinancialCategoryService } from '../../core/services/financial-category.service';
import { HarvestSeasonService } from '../../core/services/harvest-season.service';
import { PendingFinancialTransactionService } from '../../core/services/pending-financial-transaction.service';
import { ToastStore } from '../../core/stores/toast.store';
import { ConfirmDialog } from '../../shared/overlays';

import { PendingReviewDrawer } from './pending-review-drawer';

const pending: PendingFinancialTransaction = {
  id: 1,
  farmId: 10,
  farmName: 'Boa Safra',
  type: 'EXPENSE',
  amount: 250,
  transactionDate: '2026-07-20',
  description: 'Combustível',
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
    expect(confirmation.confirmLabel()).toBe('Aprovar movimentação');
    expect(confirmation.description()).toBe('A movimentação será incluída no controle financeiro.');
  });

  it('shows source data before the review form and enters rejection mode without a second dialog', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text.indexOf('Dados de origem')).toBeLessThan(text.indexOf('Descrição'));

    clickButton('Rejeitar');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Rejeitar movimentação');
    expect(fixture.nativeElement.textContent).toContain('Motivo da rejeição');
    expect(document.querySelector('#gd-confirm-dialog-title')).toBeNull();
  });

  it('cancels rejection without closing the drawer', () => {
    clickButton('Rejeitar');
    fixture.detectChanges();
    clickButton('Cancelar');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Aprovar movimentação');
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
