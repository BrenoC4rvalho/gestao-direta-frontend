import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import { FinancialTransaction } from '../../../../core/models/financial.models';

import { LatestTransactionsCard } from './latest-transactions-card';

@Component({
  template: '',
})
class RouteStub {}

const transaction: FinancialTransaction = {
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

describe('LatestTransactionsCard', () => {
  it('should render transactions received by input', async () => {
    await TestBed.configureTestingModule({
      imports: [LatestTransactionsCard],
      providers: [
        provideGestaoDiretaIcons(),
        provideRouter([{ path: '**', component: RouteStub }]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LatestTransactionsCard);
    fixture.componentRef.setInput('transactions', [transaction]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Venda de soja');
    expect(text).toContain('Vendas');
    expect(text).toContain('Paga');
    expect(text).toContain('Ver todas');
  });

  it('should render empty state for empty lists', async () => {
    await TestBed.configureTestingModule({
      imports: [LatestTransactionsCard],
      providers: [
        provideGestaoDiretaIcons(),
        provideRouter([{ path: '**', component: RouteStub }]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LatestTransactionsCard);
    fixture.componentRef.setInput('transactions', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhuma movimentação encontrada');
  });
});
