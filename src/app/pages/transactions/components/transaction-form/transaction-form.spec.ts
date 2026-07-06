import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import { HarvestSeason } from '../../../../core/models/harvest-season.models';
import { FinancialCategory } from '../../../../core/models/financial-category.models';
import {
  FinancialTransaction,
  UpdateFinancialTransactionRequest,
} from '../../../../core/models/financial-transaction.models';

import { TransactionForm } from './transaction-form';

const expenseCategory: FinancialCategory = {
  id: 1,
  name: 'Insumos',
  type: 'EXPENSE',
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
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

const plannedSeason: HarvestSeason = {
  id: 10,
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  productionActivityId: 1,
  productionActivityName: 'Soja',
  name: 'Safra Soja 2025/26',
  startDate: '2025-09-01',
  endDate: null,
  status: 'PLANNED',
};

const inProgressSeason: HarvestSeason = {
  ...plannedSeason,
  id: 11,
  name: 'Safra Milho Verão 2026',
  status: 'IN_PROGRESS',
};

const finishedSeason: HarvestSeason = {
  ...plannedSeason,
  id: 12,
  name: 'Safra Finalizada',
  status: 'FINISHED',
};

const transaction: FinancialTransaction = {
  id: 1,
  description: 'Compra de sementes',
  amount: 99.99,
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
  harvestSeasonId: 10,
  harvestSeasonName: 'Safra Soja 2025/26',
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
      [harvestSeasons]="harvestSeasons"
      [open]="open"
      [submitting]="submitting"
      (submitted)="submitted = $event"
      (cancelled)="cancelledCount = cancelledCount + 1"
    />
  `,
})
class TransactionFormHost {
  transaction: FinancialTransaction | null = null;
  harvestSeasons: HarvestSeason[] = [plannedSeason, inProgressSeason, finishedSeason];
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
    fillRequiredFields();
    setSelect('#transaction-category', '1');
    setInput('#transaction-due-date', '2026-06-30');
    setTextarea('Compra para safra');
    submitForm();

    expect(fixture.componentInstance.submitted).toEqual({
      description: 'Compra de sementes',
      amount: 99.99,
      type: 'EXPENSE',
      status: 'PENDING',
      paymentMethod: 'PIX',
      transactionDate: '2026-06-21',
      dueDate: '2026-06-30',
      paidAt: null,
      notes: 'Compra para safra',
      categoryId: 1,
      harvestSeasonId: null,
    });
  });

  it('should submit selected harvest season', () => {
    fillRequiredFields();
    setSelect('#transaction-category', '1');
    setSelect('#transaction-harvest-season', '10');
    submitForm();

    expect(fixture.componentInstance.submitted).toEqual(
      expect.objectContaining({ harvestSeasonId: 10 }),
    );
  });

  it('should keep harvest season optional', () => {
    fillRequiredFields();
    setSelect('#transaction-category', '1');
    submitForm();

    expect(fixture.componentInstance.submitted).toEqual(
      expect.objectContaining({ harvestSeasonId: null }),
    );
  });

  it('should allow removing harvest season when editing', () => {
    openForEdit(transaction);
    setSelect('#transaction-harvest-season', '');
    submitForm();

    expect(fixture.componentInstance.submitted).toEqual(
      expect.objectContaining({ harvestSeasonId: null }),
    );
  });

  it('should show the current harvest season when it is not an allowed option', () => {
    openForEdit({
      ...transaction,
      harvestSeasonId: 12,
      harvestSeasonName: 'Safra Finalizada',
    });

    expect(getSelectOptionTexts('#transaction-harvest-season')).toEqual([
      'Sem safra',
      'Safra Finalizada (atual)',
      'Safra Soja 2025/26',
      'Safra Milho Verão 2026',
    ]);
  });

  it('should sanitize Brazilian money input', () => {
    setInput('#transaction-amount', 'R$ 1.234,567abc');

    expect(getInput('#transaction-amount').value).toBe('1234,56');
  });

  it('should keep only one comma while typing amount', () => {
    setInput('#transaction-amount', '12,3,4,5');

    expect(getInput('#transaction-amount').value).toBe('12,34');
  });

  it('should show positive value error for zero', () => {
    fillRequiredFields();
    setInput('#transaction-amount', '0,00');
    submitForm();

    expect(fixture.componentInstance.submitted).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Informe um valor maior que zero.');
  });

  it('should reset with transaction values when editing', () => {
    fixture = TestBed.createComponent(TransactionFormHost);
    fixture.componentInstance.transaction = transaction;
    fixture.detectChanges();

    expect(getInput('#transaction-description').value).toBe('Compra de sementes');
    expect(getInput('#transaction-amount').value).toBe('99,99');
  });

  it('should submit edited transaction with numeric amount', () => {
    openForEdit(transaction);
    submitForm();

    expect(fixture.componentInstance.submitted).toEqual(
      expect.objectContaining({ amount: 99.99 }),
    );
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

  it('should show only active expense categories for expense transactions', () => {
    expect(categoryOptionLabels()).toEqual(['Selecione a categoria', 'Insumos']);
  });

  it('should show only active income categories for income transactions', () => {
    setSelect('#transaction-type', 'INCOME');

    expect(categoryOptionLabels()).toEqual(['Selecione a categoria', 'Venda de leite']);
  });

  it('should clear an expense category when changing from expense to income', () => {
    setSelect('#transaction-category', '1');
    setSelect('#transaction-type', 'INCOME');

    expect(getSelect('#transaction-category').value).toBe('');
  });

  it('should clear an income category when changing from income to expense', () => {
    setSelect('#transaction-type', 'INCOME');
    setSelect('#transaction-category', '2');
    setSelect('#transaction-type', 'EXPENSE');

    expect(getSelect('#transaction-category').value).toBe('');
  });

  it('should show only expense categories when editing an expense transaction', () => {
    openForEdit(transaction);

    expect(categoryOptionLabels()).toEqual(['Selecione a categoria', 'Insumos']);
  });

  it('should show only income categories when editing an income transaction', () => {
    openForEdit({ ...transaction, type: 'INCOME', categoryId: 2, categoryName: 'Venda de leite' });

    expect(categoryOptionLabels()).toEqual(['Selecione a categoria', 'Venda de leite']);
  });

  it('should keep a compatible category when editing', () => {
    openForEdit(transaction);

    expect(getSelect('#transaction-category').value).toContain('1');
  });

  it('should clear an incompatible category when editing', () => {
    openForEdit({ ...transaction, type: 'INCOME', categoryId: 1 });

    expect(getSelect('#transaction-category').value).toBe('');
  });

  it('should clear a missing category when editing', () => {
    openForEdit({ ...transaction, categoryId: 999 });

    expect(getSelect('#transaction-category').value).toBe('');
  });

  it('should disable category and ask for type first when type is empty', () => {
    setSelect('#transaction-type', '');

    const categorySelect = getSelect('#transaction-category');
    expect(categorySelect.disabled).toBe(true);
    expect(categoryOptionLabels()).toEqual(['Selecione o tipo primeiro']);
  });

  it('should disable category and show unavailable placeholder when no compatible categories exist', () => {
    openWithCategories([expenseCategory]);
    setSelect('#transaction-type', 'INCOME');

    const categorySelect = getSelect('#transaction-category');
    expect(categorySelect.disabled).toBe(true);
    expect(categoryOptionLabels()).toEqual(['Nenhuma categoria disponível para este tipo']);
  });

  it('should not show inactive categories', () => {
    expect(categoryOptionLabels()).not.toContain('Inativa');
  });

  it('should not emit when a required category becomes incompatible before submit', () => {
    fillRequiredFields();
    setSelect('#transaction-category', '1');
    setSelect('#transaction-type', 'INCOME');
    submitForm();

    expect(fixture.componentInstance.submitted).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Selecione a categoria.');
  });

  it('should submit without an incompatible category when no compatible category is required', () => {
    openWithCategories([expenseCategory]);
    fillRequiredFields();
    setSelect('#transaction-category', '1');
    setSelect('#transaction-type', 'INCOME');
    submitForm();

    expect(fixture.componentInstance.submitted).toEqual(
      expect.objectContaining({ type: 'INCOME', categoryId: null }),
    );
  });

  function openWithCategories(categories: FinancialCategory[]): void {
    fixture = TestBed.createComponent(TransactionFormHost);
    fixture.componentInstance.categories = categories;
    fixture.detectChanges();
  }

  function openForEdit(value: FinancialTransaction): void {
    fixture = TestBed.createComponent(TransactionFormHost);
    fixture.componentInstance.transaction = value;
    fixture.detectChanges();
  }

  function fillRequiredFields(): void {
    setInput('#transaction-description', 'Compra de sementes');
    setInput('#transaction-amount', '99,99');
    setInput('#transaction-date', '2026-06-21');
    setSelect('#transaction-payment-method', 'PIX');
  }

  function submitForm(): void {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function setInput(selector: string, value: string): void {
    const input = getInput(selector);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function getInput(selector: string): HTMLInputElement {
    return Array.from(
      fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>,
    ).find((item) => item.id === selector.slice(1)) as HTMLInputElement;
  }

  function setTextarea(value: string): void {
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = value;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function setSelect(selector: string, value: string): void {
    const select = getSelect(selector);
    const option = Array.from(select.options).find((item) => item.value.includes(value));
    select.selectedIndex = option?.index ?? 0;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function getSelect(selector: string): HTMLSelectElement {
    return Array.from(
      fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>,
    ).find((item) => item.id === selector.slice(1)) as HTMLSelectElement;
  }

  function categoryOptionLabels(): string[] {
    return getSelectOptionTexts('#transaction-category');
  }

  function getSelectOptionTexts(selector: string): string[] {
    return Array.from(getSelect(selector).options).map(
      (option) => option.textContent?.trim() ?? '',
    );
  }

  function findButton(label: string): HTMLButtonElement | undefined {
    return Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.trim() === label);
  }
});
