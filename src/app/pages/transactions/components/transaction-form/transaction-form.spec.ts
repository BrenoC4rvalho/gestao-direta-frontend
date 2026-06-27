import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinancialCategory } from '../../../../core/models/financial-category.models';
import {
  FinancialTransaction,
  UpdateFinancialTransactionRequest,
} from '../../../../core/models/financial-transaction.models';
import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';

import { TransactionForm } from './transaction-form';

const expenseCategory: FinancialCategory = {
  id: 1,
  name: 'Insumos',
  type: 'EXPENSE',
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  isDefault: false,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
};

const incomeCategory: FinancialCategory = {
  ...expenseCategory,
  id: 2,
  name: 'Venda de leite',
  type: 'INCOME',
};

const inactiveCategory: FinancialCategory = {
  ...expenseCategory,
  id: 3,
  name: 'Inativa',
  status: 'INACTIVE',
};

const transaction: FinancialTransaction = {
  id: 1,
  description: 'Compra de sementes',
  amount: 2500,
  type: 'EXPENSE',
  status: 'PENDING',
  paymentMethod: 'PIX',
  transactionDate: '2026-06-21',
  dueDate: '2026-06-30',
  paidAt: null,
  notes: 'Compra para safra',
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  categoryId: 1,
  categoryName: 'Insumos',
  createdByUserId: 2,
  createdByUserName: 'User',
  updatedByUserId: null,
  updatedByUserName: null,
  recordStatus: 'ACTIVE',
  createdAt: '2026-06-21T10:00:00',
  updatedAt: '2026-06-21T10:00:00',
};

@Component({
  imports: [TransactionForm],
  template: `
    <gd-transaction-form
      [transaction]="transaction"
      [categories]="categories"
      [open]="open"
      [submitting]="submitting"
      (submitted)="submitted = $event"
      (cancelled)="cancelledCount = cancelledCount + 1"
    />
  `,
})
class TransactionFormHost {
  transaction: FinancialTransaction | null = null;
  categories: FinancialCategory[] = [expenseCategory, incomeCategory, inactiveCategory];
  open = true;
  submitting = false;
  submitted: UpdateFinancialTransactionRequest | null = null;
  cancelledCount = 0;
}

describe('TransactionForm', () => {
  let fixture: ComponentFixture<TransactionFormHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionFormHost],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionFormHost);
    fixture.detectChanges();
  });

  it('should render required fields and date inputs', () => {
    const text = fixture.nativeElement.textContent as string;
    const dateInputs = fixture.nativeElement.querySelectorAll('input[type="date"]');

    expect(text).toContain('Descrição');
    expect(text).toContain('Valor');
    expect(text).toContain('Status de pagamento');
    expect(dateInputs.length).toBe(3);
  });

  it('should show required and positive value errors', () => {
    submitForm();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Informe a descrição.');
    expect(text).toContain('Informe o valor.');
  });

  it('should submit a normalized payload', () => {
    setInput('#transaction-description', 'Compra de sementes');
    setInput('#transaction-amount', '2500');
    setSelect('#transaction-category', '1');
    setInput('#transaction-date', '2026-06-21');
    setInput('#transaction-due-date', '2026-06-30');
    setSelect('#transaction-payment-method', 'PIX');
    setTextarea('Compra para safra');
    submitForm();

    expect(fixture.componentInstance.submitted).toEqual({
      description: 'Compra de sementes',
      amount: 2500,
      type: 'EXPENSE',
      status: 'PENDING',
      paymentMethod: 'PIX',
      transactionDate: '2026-06-21',
      dueDate: '2026-06-30',
      paidAt: null,
      notes: 'Compra para safra',
      categoryId: 1,
    });
  });

  it('should reset with transaction values when editing', () => {
    fixture = TestBed.createComponent(TransactionFormHost);
    fixture.componentInstance.transaction = transaction;
    fixture.detectChanges();

    const description = Array.from(fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>).find((item) => item.id === 'transaction-description') as HTMLInputElement;
    expect(description.value).toBe('Compra de sementes');
  });

  it('should emit cancel when not loading and block while submitting', () => {
    findButton('Cancelar')?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.cancelledCount).toBe(1);

    fixture = TestBed.createComponent(TransactionFormHost);
    fixture.componentInstance.submitting = true;
    fixture.detectChanges();
    findButton('Cancelar')?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.cancelledCount).toBe(0);
  });

  it('should filter categories by selected type and active status', () => {
    expect(fixture.nativeElement.textContent).toContain('Insumos');
    expect(fixture.nativeElement.textContent).not.toContain('Venda de leite');
    expect(fixture.nativeElement.textContent).not.toContain('Inativa');

    setSelect('#transaction-type', 'INCOME');

    expect(fixture.nativeElement.textContent).toContain('Venda de leite');
    expect(fixture.nativeElement.textContent).not.toContain('Insumos');
  });

  function submitForm(): void {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function setInput(selector: string, value: string): void {
    const input = Array.from(fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>).find((item) => item.id === selector.slice(1)) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function setTextarea(value: string): void {
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = value;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function setSelect(selector: string, value: string): void {
    const select = Array.from(fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>).find((item) => item.id === selector.slice(1)) as HTMLSelectElement;
    const option = Array.from(select.options).find((item) => item.value.includes(value));
    select.selectedIndex = option?.index ?? 0;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function findButton(label: string): HTMLButtonElement | undefined {
    return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (button) => button.textContent?.trim() === label,
    );
  }
});
