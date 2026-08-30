import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../../core/constants/lucide-icons';
import { Farm } from '../../../core/models/farm.models';
import { FinancialReportResponse } from '../../../core/models/financial-report.models';
import { PageResponse } from '../../../core/models/page-response.model';
import { FinancialCategoryService } from '../../../core/services/financial-category.service';
import { FinancialService } from '../../../core/services/financial.service';
import { HarvestSeasonService } from '../../../core/services/harvest-season.service';
import { FarmAccessStore } from '../../../core/stores/farm-access.store';
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
      next30DaysAvailable: true,
      next30DaysReceivable: 65000,
      next30DaysPayable: 42000,
    },
    evolution: [],
    cashFlow: {
      openingExpectedBalance: 0,
      openingProjectedBalance: 0,
      points: [],
    },
    categories: [
      {
        type: 'EXPENSE',
        totalAmount: 194300,
        totalTransactionCount: 13,
        items: [
          {
            categoryId: 1,
            categoryName: 'Insumos',
            type: 'EXPENSE',
            amount: 40150,
            percentage: 20.66,
            transactionCount: 8,
          },
          {
            categoryId: 2,
            categoryName: 'Sementes',
            type: 'EXPENSE',
            amount: 34900,
            percentage: 17.96,
            transactionCount: 5,
          },
        ],
      },
      {
        type: 'INCOME',
        totalAmount: 220000,
        totalTransactionCount: 14,
        items: [
          {
            categoryId: 3,
            categoryName: 'Venda de produção',
            type: 'INCOME',
            amount: 211500,
            percentage: 96.14,
            transactionCount: 14,
          },
        ],
      },
    ],
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
    const farmAccessStore = TestBed.inject(FarmAccessStore);
    const sessionStore = TestBed.inject(SessionStore);
    selectedFarmStore.clear();
    farmAccessStore.clear();
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
    farmAccessStore.setLoading(false);
    farmAccessStore.setAccess({
      farmId: farm.id,
      farmName: farm.name,
      userId: 1,
      userType: 'ADMIN',
      role: null,
      permissions: {
        canViewFarm: true,
        canEditFarm: true,
        canChangeFarmStatus: true,
        canManageFarmUsers: true,
        canViewFinancial: true,
        canManageTransactions: true,
        canManageCategories: true,
        canManageGlobalCategories: true,
        canCreateFarm: true,
      },
    });

    fixture = TestBed.createComponent(FinancialReportPage);
    fixture.detectChanges();
    fixture.componentInstance.report.set(report());
    fixture.componentInstance.reportLoading.set(false);
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

  it('should show only consolidated indicators on the main page', () => {
    expect((fixture.componentInstance as unknown as { canViewReport: () => boolean }).canViewReport()).toBe(true);
    expect(fixture.componentInstance.report()).not.toBeNull();
    expect(fixture.componentInstance.reportLoading()).toBe(false);
    const consolidatedSection = fixture.nativeElement.querySelector(
      'section[aria-label="Visão consolidada"]',
    ) as HTMLElement;

    expect(consolidatedSection.textContent).toContain('Receitas totais');
    expect(consolidatedSection.textContent).toContain('Despesas totais');
    expect(consolidatedSection.textContent).toContain('Saldo líquido');
    expect(consolidatedSection.textContent).toContain('Margem');
    expect(consolidatedSection.querySelectorAll('gd-summary-card').length).toBe(4);
    expect(
      Array.from(consolidatedSection.querySelectorAll('gd-summary-card')).every((card) =>
        card.querySelector('article')?.classList.contains('h-[176px]'),
      ),
    ).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('Receitas realizadas');
    expect(fixture.nativeElement.textContent).not.toContain('Compromissos financeiros');
    expect(fixture.nativeElement.textContent).not.toContain('Próximos 30 dias');
  });

  it('should switch evolution granularity without reloading the page', () => {
    const monthlyButton = button('Mensal');
    const quarterlyButton = button('Trimestral');

    expect(monthlyButton.getAttribute('aria-pressed')).toBe('true');
    expect(quarterlyButton.getAttribute('aria-pressed')).toBe('false');

    quarterlyButton.click();
    fixture.detectChanges();

    expect(monthlyButton.getAttribute('aria-pressed')).toBe('false');
    expect(quarterlyButton.getAttribute('aria-pressed')).toBe('true');
  });

  it('should show expense categories by default and switch to income without another request', () => {
    const section = categorySummarySection();

    expect(button('Despesas').getAttribute('aria-pressed')).toBe('true');
    expect(button('Receitas').getAttribute('aria-pressed')).toBe('false');
    expect(section.textContent).toContain('Despesas por categoria');
    expect(section.textContent).toContain(currency(194300));
    expect(section.textContent).toContain('13 movimentações');
    expect(section.textContent).toContain('Insumos');
    expect(section.textContent).not.toContain('Venda de produção');
    expect(section.querySelector('.bg-danger')).not.toBeNull();
    expect(section.querySelector('gd-tooltip')).not.toBeNull();

    button('Receitas').click();
    fixture.detectChanges();

    expect(button('Despesas').getAttribute('aria-pressed')).toBe('false');
    expect(button('Receitas').getAttribute('aria-pressed')).toBe('true');
    expect(section.textContent).toContain('Receitas por categoria');
    expect(section.textContent).toContain(currency(220000));
    expect(section.textContent).toContain('Venda de produção');
    expect(section.textContent).not.toContain('Insumos');
    expect(section.querySelector('.bg-success')).not.toBeNull();
  });

  it('should show an accessible empty state for the selected category type', () => {
    setReport({
      ...report(),
      categories: [
        { type: 'EXPENSE', totalAmount: 0, totalTransactionCount: 0, items: [] },
        ...report().categories.filter((category) => category.type === 'INCOME'),
      ],
    });

    const section = categorySummarySection();
    const emptyState = section.querySelector('gd-empty-state') as HTMLElement;

    expect(emptyState).not.toBeNull();
    expect(emptyState.textContent).toContain('Nenhuma despesa encontrada para os filtros selecionados.');
  });

  it('should keep category items in a padded internal scroll viewport', () => {
    const viewport = fixture.nativeElement.querySelector(
      '[data-testid="category-summary-scroll"]',
    ) as HTMLElement;

    expect(viewport.classList.contains('max-h-[26rem]')).toBe(true);
    expect(viewport.classList.contains('overflow-x-hidden')).toBe(true);
    expect(viewport.classList.contains('overflow-y-auto')).toBe(true);
    expect(viewport.classList.contains('pr-3')).toBe(true);
    expect(viewport.classList.contains('[scrollbar-gutter:stable]')).toBe(true);
  });

  it('should open the detailed indicators dialog with every summary group', () => {
    button('Ver todos os indicadores').click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;

    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Indicadores financeiros');
    expect(dialog.textContent).toContain('Visão consolidada');
    expect(dialog.textContent).toContain('Realizado');
    expect(dialog.textContent).toContain('Projetado');
    expect(dialog.textContent).toContain('Compromissos financeiros');
    expect(dialog.textContent).toContain('Próximos 30 dias');
    expect(dialog.querySelectorAll('gd-summary-card').length).toBe(18);
    expect(
      Array.from(dialog.querySelectorAll('gd-summary-card')).every((card) =>
        card.querySelector('article')?.classList.contains('h-[176px]'),
      ),
    ).toBe(true);
    expect(dialog.classList.contains('max-h-[85dvh]')).toBe(true);
    expect(fixture.nativeElement.querySelector('.gd-fade-in-up gd-drawer')).toBeNull();

    const scrollViewport = dialog.querySelector('.overflow-y-auto') as HTMLElement;
    const scrollContent = scrollViewport.firstElementChild as HTMLElement;
    expect(scrollViewport.classList.contains('[scrollbar-gutter:stable]')).toBe(true);
    expect(scrollViewport.classList.contains('min-h-0')).toBe(true);
    expect(scrollContent.classList.contains('overflow-y-auto')).toBe(false);
    expect(scrollContent.classList.contains('px-4')).toBe(true);
    expect(scrollContent.classList.contains('sm:px-5')).toBe(true);
    expect(scrollContent.classList.contains('pb-6')).toBe(true);
  });

  it('should close the detailed indicators dialog from its close button and Escape', async () => {
    button('Ver todos os indicadores').click();
    fixture.detectChanges();

    closeButton().click();
    fixture.detectChanges();
    await waitForDrawerClose();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();

    button('Ver todos os indicadores').click();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    await waitForDrawerClose();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
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

  it('should omit the next thirty days group when it is unavailable', () => {
    const value = report();
    value.commitments.next30DaysAvailable = false;
    value.commitments.next30DaysReceivable = null;
    value.commitments.next30DaysPayable = null;
    setReport(value);

    expect(summaryGroups().map((group) => group.title)).not.toContain('Próximos 30 dias');
    button('Ver todos os indicadores').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]').textContent).not.toContain(
      'Próximos 30 dias',
    );
  });

  it('should restore the next thirty days group when the filtered report changes', () => {
    setReport({
      ...report(),
      commitments: {
        ...report().commitments,
        next30DaysAvailable: false,
        next30DaysReceivable: null,
        next30DaysPayable: null,
      },
    });
    expect(summaryGroups().map((group) => group.title)).not.toContain('Próximos 30 dias');

    setReport(report());

    expect(summaryGroups().map((group) => group.title)).toContain('Próximos 30 dias');
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

    button('Ver todos os indicadores').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]').textContent).toContain(currency(-60));
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

  function button(label: string): HTMLButtonElement {
    return Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find(
      (element: HTMLButtonElement) => element.textContent?.trim() === label,
    ) as HTMLButtonElement;
  }

  function categorySummarySection(): HTMLElement {
    return fixture.nativeElement.querySelector(
      'section[aria-labelledby="category-summary-title"]',
    ) as HTMLElement;
  }

  function closeButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[aria-label="Fechar drawer"]') as HTMLButtonElement;
  }

  async function waitForDrawerClose(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 260));
    fixture.detectChanges();
  }

  function currency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }
});
