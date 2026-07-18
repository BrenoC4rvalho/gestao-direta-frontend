import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FarmAccessStore } from '../../../core/stores/farm-access.store';
import { provideGestaoDiretaIcons } from '../../../core/constants/lucide-icons';
import { SelectedFarmStore } from '../../../core/stores/selected-farm.store';
import { SessionStore } from '../../../core/stores/session.store';
import { FinancialReportPage } from './financial-report-page';
import { FINANCIAL_REPORT_TRANSACTIONS } from './financial-report.mocks';

describe('financial report mocks', () => {
  it('provides the default cash-basis totals used by the report cards', () => {
    const income = FINANCIAL_REPORT_TRANSACTIONS.filter((item) => item.type === 'INCOME').reduce((total, item) => total + item.amount, 0);
    const expense = FINANCIAL_REPORT_TRANSACTIONS.filter((item) => item.type === 'EXPENSE').reduce((total, item) => total + item.amount, 0);

    expect(income).toBe(182500);
    expect(expense).toBe(96500);
    expect(income - expense).toBe(86000);
  });

  it('includes paid, pending and overdue transactions without HTTP fixtures', () => {
    expect(new Set(FINANCIAL_REPORT_TRANSACTIONS.map((item) => item.paymentStatus))).toEqual(new Set(['PAID', 'PENDING', 'OVERDUE']));
  });
});

describe('FinancialReportPage layout', () => {
  let fixture: ComponentFixture<FinancialReportPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinancialReportPage],
      providers: [
        { provide: SelectedFarmStore, useValue: { selectedFarmId: signal(1) } },
        { provide: FarmAccessStore, useValue: { loading: signal(false), access: signal({}), error: signal(null), canViewFinancial: signal(true) } },
        { provide: SessionStore, useValue: { isAdmin: signal(true) } },
        provideGestaoDiretaIcons(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FinancialReportPage);
    fixture.detectChanges();
  });

  it('renders the report blocks in the intended order without duplicated summary or filters', () => {
    const root = fixture.nativeElement as HTMLElement;
    const content = root.textContent ?? '';
    const labels = ['Exportar PDF', 'Receitas totais', 'Filtros', 'Evolução financeira', 'Resumo por categoria', 'Resumo por safra', 'Indicadores do relatório', 'Movimentações do período'];

    expect(labels.map((label) => content.indexOf(label))).toEqual([...labels].map((label) => content.indexOf(label)).sort((first, second) => first - second));
    expect(root.querySelectorAll('gd-summary-card').length).toBe(4);
    expect(root.querySelectorAll('form[aria-label="Filtros do relatório financeiro"]').length).toBe(1);
  });

  it('keeps the root vertical spacing as the only main-section spacing mechanism', () => {
    const root = fixture.nativeElement.querySelector('section.gd-fade-in-up') as HTMLElement;

    expect(root.classList.contains('space-y-6')).toBe(true);
    expect([...root.classList].some((className) => /^(m|mt|mb|my)-/.test(className))).toBe(false);
    expect(root.querySelector('form[aria-label="Filtros do relatório financeiro"]')?.closest('gd-card')?.classList.contains('block')).toBe(true);
  });
});
