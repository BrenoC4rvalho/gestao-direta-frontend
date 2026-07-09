import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import { FinancialCategory } from '../../../../core/models/financial-category.models';
import { FinancialTransactionDraft } from '../../../../core/models/financial-transaction.models';
import { TransactionFormDrawer } from './transaction-form-drawer';

const category: FinancialCategory = {
  id: 1,
  name: 'Insumos',
  type: 'EXPENSE',
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
};

@Component({
  imports: [TransactionFormDrawer],
  template: `
    <gd-transaction-form-drawer
      [open]="open"
      [draft]="draft"
      [categories]="categories"
      [warnings]="warnings"
      (submitted)="submittedCount = submittedCount + 1"
      (cancelled)="cancelledCount = cancelledCount + 1"
      (closed)="closedCount = closedCount + 1"
    />
  `,
})
class TransactionFormDrawerHost {
  open = true;
  categories: FinancialCategory[] = [category];
  warnings = ['Dados sugeridos por IA. Revise antes de salvar.'];
  draft: FinancialTransactionDraft = {
    description: 'Adubo',
    amount: 250,
    type: 'EXPENSE',
    status: 'PAID',
    paymentMethod: 'PIX',
    transactionDate: '2026-07-06',
    categoryId: 1,
  };
  submittedCount = 0;
  cancelledCount = 0;
  closedCount = 0;
}

describe('TransactionFormDrawer', () => {
  let fixture: ComponentFixture<TransactionFormDrawerHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionFormDrawerHost],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionFormDrawerHost);
    fixture.detectChanges();
    fixture.detectChanges();
  });

  it('should render AI warnings and prefilled transaction form', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Dados sugeridos por IA. Revise antes de salvar.');
    expect(fixture.nativeElement.querySelector('gd-transaction-form')).not.toBeNull();
  });

  it('should forward form submit and cancel events', () => {
    const form = fixture.nativeElement.querySelector('gd-transaction-form form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const cancelButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Cancelar'));
    cancelButton?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.submittedCount).toBe(1);
    expect(fixture.componentInstance.cancelledCount).toBe(1);
  });
});
