import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import { FinancialTransaction } from '../../../../core/models/financial.models';

import { LatestTransactionsCard } from './latest-transactions-card';

@Component({
  template: '',
})
class RouteStub {}

const baseTransaction: FinancialTransaction = {
  id: 1,
  description: 'Venda de soja',
  amount: 1500,
  type: 'INCOME',
  status: 'PAID',
  paymentMethod: 'PIX',
  transactionDate: '2026-01-10',
  dueDate: null,
  paidAt: '2026-01-10',
  notes: null,
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  categoryId: 1,
  categoryName: 'Vendas',
  createdByUserId: 1,
  createdByUserName: 'Maria Silva',
  updatedByUserId: null,
  updatedByUserName: null,
  recordStatus: 'ACTIVE',
  createdAt: '2026-01-10T00:00:00Z',
  updatedAt: '2026-01-10T00:00:00Z',
};

function makeTransaction(overrides: Partial<FinancialTransaction>): FinancialTransaction {
  return { ...baseTransaction, ...overrides };
}

async function createComponent(
  transactions: readonly FinancialTransaction[],
): Promise<ComponentFixture<LatestTransactionsCard>> {
  await TestBed.configureTestingModule({
    imports: [LatestTransactionsCard],
    providers: [
      provideGestaoDiretaIcons(),
      provideRouter([{ path: '**', component: RouteStub }]),
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(LatestTransactionsCard);
  fixture.componentRef.setInput('transactions', transactions);
  fixture.detectChanges();

  return fixture;
}

function normalizedText(element: Element): string {
  return (element.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('LatestTransactionsCard', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should render the latest transactions sections and link to all transactions', async () => {
    const fixture = await createComponent([baseTransaction]);

    const text = normalizedText(fixture.nativeElement);
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(text).toContain('Últimas movimentações');
    expect(text).toContain('Entradas recentes');
    expect(text).toContain('Saídas recentes');
    expect(normalizedText(link)).toBe('Ver todas');
    expect(link.getAttribute('href')).toBe('/transactions');
  });

  it('should not render column wrappers as nested cards', async () => {
    const fixture = await createComponent([baseTransaction]);
    const incomeSection = fixture.nativeElement.querySelector('[aria-labelledby=latest-income-title]') as HTMLElement;
    const expenseSection = fixture.nativeElement.querySelector('[aria-labelledby=latest-expense-title]') as HTMLElement;

    for (const section of [incomeSection, expenseSection]) {
      expect(section.className).not.toContain('border');
      expect(section.className).not.toContain('bg-surface');
      expect(section.className).not.toContain('p-4');
      expect(section.className).not.toContain('rounded-control');
    }
  });

  it('should render income and expense transactions in their own columns', async () => {
    const income = makeTransaction({
      id: 1,
      description: 'Venda de soja',
      amount: 1500,
      type: 'INCOME',
      status: 'PAID',
      categoryName: 'Vendas',
    });
    const expense = makeTransaction({
      id: 2,
      description: 'Compra de insumos',
      amount: 850,
      type: 'EXPENSE',
      status: 'PENDING',
      categoryName: 'Insumos',
    });

    const fixture = await createComponent([income, expense]);
    const incomeSection = fixture.nativeElement.querySelector('[aria-labelledby=latest-income-title]') as HTMLElement;
    const expenseSection = fixture.nativeElement.querySelector('[aria-labelledby=latest-expense-title]') as HTMLElement;
    const incomeText = normalizedText(incomeSection);
    const expenseText = normalizedText(expenseSection);

    expect(incomeText).toContain('Venda de soja');
    expect(incomeText).not.toContain('Compra de insumos');
    expect(expenseText).toContain('Compra de insumos');
    expect(expenseText).not.toContain('Venda de soja');
  });

  it('should render translated status and signed values without type badges', async () => {
    const income = makeTransaction({
      id: 1,
      description: 'Venda de soja',
      amount: 1500,
      type: 'INCOME',
      status: 'PAID',
    });
    const expense = makeTransaction({
      id: 2,
      description: 'Compra de insumos',
      amount: 850,
      type: 'EXPENSE',
      status: 'PENDING',
    });

    const fixture = await createComponent([income, expense]);
    const text = normalizedText(fixture.nativeElement);
    const badgeLabels = Array.from(fixture.nativeElement.querySelectorAll('gd-badge') as NodeListOf<Element>).map((badge) =>
      normalizedText(badge),
    );

    expect(text).toContain('Paga');
    expect(text).toContain('Pendente');
    expect(text).toContain('+R$ 1.500,00');
    expect(text).toContain('-R$ 850,00');
    expect(badgeLabels).not.toContain('Entrada');
    expect(badgeLabels).not.toContain('Saída');
  });

  it('should render empty states by column', async () => {
    const fixture = await createComponent([]);
    const text = normalizedText(fixture.nativeElement);

    expect(text).toContain('Nenhuma entrada recente');
    expect(text).toContain('Nenhuma saída recente');
  });
});
