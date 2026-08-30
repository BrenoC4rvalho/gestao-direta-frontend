import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../../core/constants/lucide-icons';
import { Farm } from '../../../core/models/farm.models';
import { FinancialReportResponse } from '../../../core/models/financial-report.models';
import { PageResponse } from '../../../core/models/page-response.model';
import { FinancialCategoryService } from '../../../core/services/financial-category.service';
import { FinancialService } from '../../../core/services/financial.service';
import { HarvestSeasonService } from '../../../core/services/harvest-season.service';
import { SelectedFarmStore } from '../../../core/stores/selected-farm.store';
import { SessionStore } from '../../../core/stores/session.store';
import { FinancialReportPage } from './financial-report-page';

interface SummaryCardViewModel {
  title: string;
  value: string;
  tone: string;
}

interface SummaryGroupViewModel {
  title: string;
  cards: readonly SummaryCardViewModel[];
}

const farm: Farm = {
  id: 10,
  name: 'Fazenda Boa Safra',
  document: null,
  city: 'Londrina',
  state: 'PR',
  totalArea: 120,
  productionType: 'AGRICULTURE',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const harvests: PageResponse<never> = {
  content: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
};

function report(overrides: Partial<FinancialReportResponse['summary']> = {}): FinancialReportResponse {
  return {
    farmId: 10,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    basis: 'CASH',
    summary: {
      totalIncome: 220000,
      totalExpense: 194300,
      netBalance: 25700,
      marginPercentage: 11.7,
      realizedIncome: 40500,
      realizedExpense: 104600,
      projectedIncome: 179500,
      projectedExpense: 89700,
      ...overrides,
    },
    commitments: {
      accountsReceivable: 179500,
      accountsPayable: 89700,
      overdueReceivableAmount: 0,
      overdueReceivableCount: 0,
      overduePayableAmount: 0,
      overduePayableCount: 0,
      next30DaysReceivable: 65000,
      next30DaysPayable: 42000,
    },
    evolution: [],
    categories: [],
    harvests: [],
    indicators: {
      analyzedMonthCount: 0,
      highestIncomePeriod: null,
      highestExpensePeriod: null,
      bestBalancePeriod: null,
      criticalPeriod: null,
      highestExpenseCategory: null,
      mostProfitableHarvest: null,
    },
    unallocated: {
      income: 0,
      expense: 0,
      transactionCount: 0,
    },
  };
}

describe('FinancialReportPage', () => {
  let fixture: ComponentFixture<FinancialReportPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinancialReportPage],
      providers: [
        provideGestaoDiretaIcons(),
        {
          provide: FinancialService,
          useValue: {
            getFinancialReport: () => of(report()),
            getFinancialReportTransactions: () => of(harvests),
          },
        },
        {
          provide: HarvestSeasonService,
          useValue: { list: () => of(harvests) },
        },
        {
          provide: FinancialCategoryService,
          useValue: { listUsedInTransactions: () => of([]) },
        },
      ],
    }).compileComponents();

    const selectedFarmStore = TestBed.inject(SelectedFarmStore);
    const sessionStore = TestBed.inject(SessionStore);
    selectedFarmStore.clear();
    sessionStore.clear();
    selectedFarmStore.setFarms([farm]);
    sessionStore.setUser({
      id: 1,
      name: 'Admin',
      email: 'admin@example.com',
      document: null,
      userType: 'ADMIN',
      status: 'ACTIVE',
    });

    fixture = TestBed.createComponent(FinancialReportPage);
    fixture.detectChanges();
  });

  it('should organize financial indicators into consolidated, realized and projected groups', () => {
    expect(summaryGroups().map((group) => group.title)).toEqual([
      'Visão consolidada',
      'Realizado',
      'Projetado',
      'Compromissos financeiros',
      'Próximos 30 dias',
    ]);
    expect(summaryGroups()[0].cards.map((card) => card.title)).toEqual([
      'Receitas totais',
      'Despesas totais',
      'Saldo líquido',
      'Margem',
    ]);
    expect(summaryGroups()[1].cards.map((card) => card.title)).toEqual([
      'Receitas realizadas',
      'Despesas realizadas',
      'Resultado realizado',
    ]);
    expect(summaryGroups()[2].cards.map((card) => card.title)).toEqual([
      'Receitas projetadas',
      'Despesas projetadas',
      'Resultado projetado',
    ]);
    expect(summaryGroups()[3].cards.map((card) => card.title)).toEqual([
      'Contas a receber',
      'Contas a pagar',
      'Vencido a receber',
      'Vencido a pagar',
    ]);
    expect(summaryGroups()[4].cards.map((card) => card.title)).toEqual([
      'Recebimentos previstos',
      'Pagamentos previstos',
      'Fluxo líquido previsto',
      'Cobertura financeira',
    ]);
  });

  it('should derive short-term flow and coverage without division by zero', () => {
    const value = report();
    value.commitments.next30DaysReceivable = 65000;
    value.commitments.next30DaysPayable = 42000;
    setReport(value);

    expect(card('Fluxo líquido previsto')).toMatchObject({ value: currency(23000), tone: 'success' });
    expect(card('Cobertura financeira').value).toBe('1,55x');

    setReport({
      ...value,
      commitments: { ...value.commitments, next30DaysPayable: 0 },
    });
    expect(card('Cobertura financeira').value).toBe('Sem compromissos');

    setReport({
      ...value,
      commitments: { ...value.commitments, next30DaysReceivable: 0, next30DaysPayable: 0 },
    });
    expect(card('Cobertura financeira').value).toBe('—');
  });

  it('should calculate positive realized and projected results', () => {
    setReport(report({ realizedIncome: 100, realizedExpense: 40, projectedIncome: 90, projectedExpense: 10 }));

    expect(card('Resultado realizado')).toMatchObject({ value: currency(60), tone: 'success' });
    expect(card('Resultado projetado')).toMatchObject({ value: currency(80), tone: 'success' });
  });

  it('should calculate negative realized and projected results', () => {
    setReport(report({ realizedIncome: 40500, realizedExpense: 104600, projectedIncome: 89700, projectedExpense: 179500 }));

    expect(card('Resultado realizado')).toMatchObject({ value: currency(-64100), tone: 'danger' });
    expect(card('Resultado projetado')).toMatchObject({ value: currency(-89800), tone: 'danger' });
  });

  it('should use neutral tones for zero realized and projected results', () => {
    setReport(report({ realizedIncome: 100, realizedExpense: 100, projectedIncome: 200, projectedExpense: 200 }));

    expect(card('Resultado realizado')).toMatchObject({ value: currency(0), tone: 'neutral' });
    expect(card('Resultado projetado')).toMatchObject({ value: currency(0), tone: 'neutral' });
  });

  it('should recalculate results when the filtered report changes', () => {
    setReport(report({ realizedIncome: 100, realizedExpense: 20, projectedIncome: 80, projectedExpense: 30 }));
    expect(card('Resultado realizado').value).toBe(currency(80));
    expect(card('Resultado projetado').value).toBe(currency(50));

    setReport(report({ realizedIncome: 10, realizedExpense: 70, projectedIncome: 40, projectedExpense: 100 }));
    expect(card('Resultado realizado')).toMatchObject({ value: currency(-60), tone: 'danger' });
    expect(card('Resultado projetado')).toMatchObject({ value: currency(-60), tone: 'danger' });
  });

  function setReport(value: FinancialReportResponse): void {
    fixture.componentInstance.report.set(value);
    fixture.detectChanges();
  }

  function summaryGroups(): readonly SummaryGroupViewModel[] {
    return (fixture.componentInstance as unknown as {
      financialSummaryGroups: () => readonly SummaryGroupViewModel[];
    }).financialSummaryGroups();
  }

  function card(title: string): SummaryCardViewModel {
    const result = summaryGroups()
      .flatMap((group) => group.cards)
      .find((summaryCard) => summaryCard.title === title);

    if (!result) {
      throw new Error(`Summary card not found: ${title}`);
    }

    return result;
  }

  function currency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }
});
