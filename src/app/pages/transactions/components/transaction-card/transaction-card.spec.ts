import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import { FinancialTransaction } from '../../../../core/models/financial-transaction.models';

import { TransactionCard } from './transaction-card';

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
  imports: [TransactionCard],
  template: `
    <gd-transaction-card
      [transaction]="transaction"
      [canEdit]="canEdit"
      [canMarkAsPaid]="canMarkAsPaid"
      [canCancel]="canCancel"
      (editRequested)="editCount = editCount + 1"
      (markAsPaidRequested)="paidCount = paidCount + 1"
      (cancelRequested)="cancelCount = cancelCount + 1"
    />
  `,
})
class TransactionCardHost {
  transaction = transaction;
  canEdit = true;
  canMarkAsPaid = true;
  canCancel = true;
  editCount = 0;
  paidCount = 0;
  cancelCount = 0;
}

describe('TransactionCard', () => {
  let fixture: ComponentFixture<TransactionCardHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionCardHost],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionCardHost);
    fixture.detectChanges();
  });

  it('should render transaction data formatted', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Compra de sementes');
    expect(text).toContain('Insumos');
    expect(text).toContain('-R$');
    expect(text).not.toContain('Despesa');
    expect(text).toContain('Pendente');
    expect(text).toContain('Pix');
    expect(text).toContain('Safra Soja 2025/26');

    const harvestSeason = fixture.nativeElement.querySelector('[title="Safra Soja 2025/26"]') as HTMLElement;
    expect(harvestSeason.classList.contains('truncate')).toBe(true);
    expect(harvestSeason.classList.contains('whitespace-nowrap')).toBe(true);
  });

  it('should render Sem safra when transaction has no harvest season', () => {
    fixture = TestBed.createComponent(TransactionCardHost);
    fixture.componentInstance.transaction = {
      ...transaction,
      harvestSeasonId: null,
      harvestSeasonName: null,
    };
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sem safra');
  });

  it('should emit edit action and hide direct payment or cancellation actions', () => {
    const editButton = findButton('Editar movimentação');

    expect(editButton?.getAttribute('aria-label')).toBe('Editar movimentação');
    expect(editButton?.getAttribute('title')).toBe('Editar movimentação');
    expect(editButton?.querySelector('svg[lucideIcon="pencil"]')).toBeTruthy();
    expect(editButton?.textContent?.trim()).toBe('');
    editButton?.click();

    expect(fixture.componentInstance.editCount).toBe(1);
    expect(fixture.componentInstance.paidCount).toBe(0);
    expect(fixture.componentInstance.cancelCount).toBe(0);
    expect(findButton('Marcar paga')).toBeUndefined();
    expect(findButton('Cancelar')).toBeUndefined();
  });

  it('should hide actions without permissions', () => {
    fixture = TestBed.createComponent(TransactionCardHost);
    fixture.componentInstance.canEdit = false;
    fixture.componentInstance.canMarkAsPaid = false;
    fixture.componentInstance.canCancel = false;
    fixture.detectChanges();

    expect(findButton('Editar movimentação')).toBeUndefined();
    expect(findButton('Marcar paga')).toBeUndefined();
    expect(findButton('Cancelar')).toBeUndefined();
  });

  function findButton(label: string): HTMLButtonElement | undefined {
    return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (button) => button.getAttribute('aria-label') === label || button.textContent?.trim() === label,
    );
  }
});
