import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { of } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../../core/constants/lucide-icons';
import { Farm } from '../../../core/models/farm.models';
import {
  FinancialCumulativeEvolutionPoint,
  FinancialReportResponse,
} from '../../../core/models/financial-report.models';
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
  meta?: string;
}

interface SummaryGroupViewModel {
  title: string;
  gridClasses: string;
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
    realizedCumulativeEvolution: [],
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
    financialIndicators: {
      result: {
        totalIncome: 220000,
        totalExpense: 194300,
        projectedResult: 25700,
        marginPercentage: 11.7,
        realizedIncome: 40500,
        realizedExpense: 104600,
        realizedResult: -64100,
      },
      liquidity: {
        accountsReceivable: 179500,
        accountsPayable: 89700,
        overdueReceivable: 0,
        overduePayable: 0,
        coveragePercentage: 128.65,
        cashNeed: -25600,
      },
      efficiency: {
        costToIncomePercentage: 88.32,
        returnOnCostsPercentage: -61.28,
      },
      ruralManagement: {
        areaHectares: 120,
        incomePerHectare: 1833.33,
        costPerHectare: 1619.17,
        resultPerHectare: 214.16,
      },
      planning: {
        availability: 'AVAILABLE',
        incomeExecutionPercentage: 81,
        expenseExecutionPercentage: 95,
        incomeDeviation: -9500,
        expenseDeviation: -5400,
      },
    },
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
  let financialService: {
    getFinancialReport: ReturnType<typeof vi.fn>;
    getFinancialReportTransactions: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    financialService = {
      getFinancialReport: vi.fn(() => of(report())),
      getFinancialReportTransactions: vi.fn(() => of(harvests)),
    };
    await TestBed.configureTestingModule({
      imports: [FinancialReportPage],
      providers: [
        provideGestaoDiretaIcons(),
        {
          provide: FinancialService,
          useValue: financialService,
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

  it('should organize every backend indicator into the requested groups', () => {
    expect(summaryGroups().map((group) => group.title)).toEqual([
      'Resultado',
      'Liquidez e compromissos',
      'Eficiência',
      'Gestão rural',
      'Planejamento',
      'Destaques do período',
    ]);
    expect(summaryGroups()[0].cards.map((card) => card.title)).toEqual([
      'Receitas totais',
      'Despesas totais',
      'Resultado projetado',
      'Margem',
      'Receitas realizadas',
      'Despesas realizadas',
      'Resultado realizado',
    ]);
    expect(summaryGroups()[1].cards.map((card) => card.title)).toEqual([
      'Contas a receber',
      'Contas a pagar',
      'Vencidos a receber',
      'Vencidos a pagar',
      'Cobertura financeira',
      'Necessidade de caixa',
    ]);
    expect(summaryGroups()[2].cards.map((card) => card.title)).toEqual([
      'Custo sobre receita',
      'Retorno sobre custos',
    ]);
  });

  it('should show only the four main indicators on the page', () => {
    expect((fixture.componentInstance as unknown as { canViewReport: () => boolean }).canViewReport()).toBe(true);
    expect(fixture.componentInstance.report()).not.toBeNull();
    expect(fixture.componentInstance.reportLoading()).toBe(false);
    const consolidatedSection = fixture.nativeElement.querySelector(
      'section[aria-label="Visão consolidada"]',
    ) as HTMLElement;

    expect(consolidatedSection.textContent).toContain('Resultado projetado');
    expect(consolidatedSection.textContent).toContain('Margem');
    expect(consolidatedSection.textContent).toContain('Receitas realizadas');
    expect(consolidatedSection.textContent).toContain('Despesas realizadas');
    expect(consolidatedSection.querySelectorAll('gd-summary-card').length).toBe(4);
    expect(
      Array.from(consolidatedSection.querySelectorAll('gd-summary-card')).every((card) =>
        card.querySelector('article')?.classList.contains('h-[176px]'),
      ),
    ).toBe(true);
    const mainCards = (fixture.componentInstance as unknown as {
      primaryIndicatorCards: () => readonly SummaryCardViewModel[];
    }).primaryIndicatorCards();
    expect(mainCards.map((item) => item.title)).toEqual([
      'Resultado projetado',
      'Margem',
      'Receitas realizadas',
      'Despesas realizadas',
    ]);
  });

  it('should show the PDF export action when the report is available', () => {
    const exportButton = button('Exportar PDF');

    expect(exportButton.disabled).toBe(false);
    expect(exportButton.textContent).toContain('Exportar PDF');
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

  it('should render the realized cumulative income and expense chart', () => {
    const realizedCumulativeEvolution = [cumulativeEvolutionPoint()];
    setReport({ ...report(), realizedCumulativeEvolution });
    const section = fixture.nativeElement.querySelector(
      'section[aria-labelledby="financial-income-expense-title"]',
    ) as HTMLElement;
    const chart = section.querySelector('gd-financial-income-expense-chart') as HTMLElement;

    expect(section.textContent).toContain('Receitas e despesas acumuladas');
    expect(section.textContent).toContain(
      'Acompanhe a evolução acumulada das entradas e saídas ao longo do período selecionado.',
    );
    expect(chart).not.toBeNull();
    expect(chart.textContent).toContain('Receitas acumuladas');
    expect(chart.textContent).toContain('Despesas acumuladas');
    expect(chart.textContent).not.toContain('Resultado');
  });

  it('should reload both charts with the shared report filters and granularity', () => {
    financialService.getFinancialReport.mockClear();
    const component = fixture.componentInstance as unknown as {
      filterForm: {
        setValue: (value: {
          startDate: string;
          endDate: string;
          basis: string;
          harvestSeasonId: number;
          categoryId: number;
        }) => void;
      };
      applyFilters: () => void;
      selectEvolutionGranularity: (granularity: 'MONTHLY' | 'QUARTERLY') => void;
    };
    component.filterForm.setValue({
      startDate: '2026-03-15',
      endDate: '2026-08-20',
      basis: 'ACCRUAL',
      harvestSeasonId: 25,
      categoryId: 7,
    });
    component.applyFilters();
    fixture.detectChanges();

    expect(financialService.getFinancialReport).toHaveBeenLastCalledWith({
      farmId: 10,
      startDate: '2026-03-15',
      endDate: '2026-08-20',
      basis: 'ACCRUAL',
      harvestSeasonIds: [25],
      categoryIds: [7],
      granularity: 'MONTHLY',
    });

    component.selectEvolutionGranularity('QUARTERLY');
    fixture.detectChanges();

    expect(financialService.getFinancialReport).toHaveBeenLastCalledWith({
      farmId: 10,
      startDate: '2026-03-15',
      endDate: '2026-08-20',
      basis: 'ACCRUAL',
      harvestSeasonIds: [25],
      categoryIds: [7],
      granularity: 'QUARTERLY',
    });
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
    expect(dialog.textContent).toContain(
      'Veja os principais indicadores calculados com base nos filtros selecionados.',
    );
    expect(dialog.textContent).toContain('Resultado');
    expect(dialog.textContent).toContain('Liquidez e compromissos');
    expect(dialog.textContent).toContain('Eficiência');
    expect(dialog.textContent).toContain('Gestão rural');
    expect(dialog.textContent).toContain('Planejamento');
    expect(dialog.textContent).toContain('Destaques do período');
    expect(dialog.querySelectorAll('gd-summary-card').length).toBe(27);
    expect(
      summaryGroups().every((group) => group.gridClasses.includes('xl:grid-cols-4')),
    ).toBe(true);
    expect(
      Array.from(dialog.querySelectorAll('gd-summary-card')).every((card) =>
        card.querySelector('article')?.classList.contains('min-h-[100px]'),
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

  it('should present backend values without recalculating financial indicators', () => {
    const value = report({
      totalIncome: 1,
      totalExpense: 1,
      realizedIncome: 1,
      realizedExpense: 1,
    });
    value.financialIndicators.result.projectedResult = -4321;
    value.financialIndicators.result.realizedResult = 987;
    value.financialIndicators.liquidity.coveragePercentage = 123.45;
    setReport(value);

    expect(card('Resultado projetado')).toMatchObject({ value: currency(-4321), tone: 'danger' });
    expect(card('Resultado realizado')).toMatchObject({ value: currency(987), tone: 'success' });
    expect(card('Cobertura financeira').value).toBe('123,5%');
  });

  it('should render unavailable ratios without null, NaN or Infinity', () => {
    const value = report();
    value.financialIndicators.result.marginPercentage = null;
    value.financialIndicators.liquidity.coveragePercentage = null;
    value.financialIndicators.efficiency.costToIncomePercentage = null;
    value.financialIndicators.efficiency.returnOnCostsPercentage = null;
    setReport(value);

    expect(card('Margem').value).toBe('—');
    expect(card('Cobertura financeira').value).toBe('—');
    expect(card('Custo sobre receita').value).toBe('—');
    expect(card('Retorno sobre custos').value).toBe('—');
    expect(fixture.nativeElement.textContent).not.toMatch(/NaN|Infinity|null|undefined/);
  });

  it('should omit rural indicators when the backend marks the context unavailable', () => {
    const value = report();
    value.financialIndicators.ruralManagement = null;
    setReport(value);

    expect(summaryGroups().map((group) => group.title)).not.toContain('Gestão rural');
  });

  it('should explain unavailable planning without showing monetary zero', () => {
    const value = report();
    value.financialIndicators.planning = {
      availability: 'HARVEST_REQUIRED',
      incomeExecutionPercentage: null,
      expenseExecutionPercentage: null,
      incomeDeviation: null,
      expenseDeviation: null,
    };
    setReport(value);

    expect(card('Execução do orçamento')).toMatchObject({
      value: '—',
      tone: 'neutral',
    });
    expect(card('Execução do orçamento').meta).toBe('Selecione uma única Safra.');
    expect(card('Desvio do orçamento').value).toBe('—');
  });

  it('should accept exactly twelve calendar months and reject a longer period', () => {
    financialService.getFinancialReport.mockClear();
    const component = fixture.componentInstance as unknown as {
      filterForm: FormGroup;
      applyFilters: () => void;
    };

    component.filterForm.patchValue({ startDate: '2024-02-29', endDate: '2025-02-28' });
    component.applyFilters();
    fixture.detectChanges();
    expect(component.filterForm.valid).toBe(true);
    expect(financialService.getFinancialReport).toHaveBeenCalledTimes(1);

    component.filterForm.patchValue({ endDate: '2025-03-01' });
    component.applyFilters();
    fixture.detectChanges();
    expect(component.filterForm.hasError('maxPeriod')).toBe(true);
    expect(financialService.getFinancialReport).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain(
      'O período do relatório não pode ultrapassar 12 meses.',
    );
  });

  it('should reject an end date before the start date without requesting the report', () => {
    financialService.getFinancialReport.mockClear();
    const component = fixture.componentInstance as unknown as {
      filterForm: FormGroup;
      applyFilters: () => void;
    };
    component.filterForm.patchValue({ startDate: '2026-02-01', endDate: '2026-01-31' });

    component.applyFilters();
    fixture.detectChanges();

    expect(component.filterForm.hasError('dateOrder')).toBe(true);
    expect(financialService.getFinancialReport).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'A data final deve ser igual ou posterior à data inicial.',
    );
  });

  it('should preserve loading and error states for the report request', () => {
    fixture.componentInstance.reportLoading.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('section[aria-label="Visão consolidada"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('gd-skeleton').length).toBeGreaterThan(0);

    fixture.componentInstance.reportLoading.set(false);
    fixture.componentInstance.report.set(null);
    fixture.componentInstance.reportError.set('Falha controlada');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Erro ao carregar relatório');
    expect(fixture.nativeElement.textContent).toContain('Falha controlada');
  });

  it('should preserve the empty state when the filtered report has no movements', () => {
    const value = report({
      totalIncome: 0,
      totalExpense: 0,
      netBalance: 0,
      marginPercentage: 0,
      realizedIncome: 0,
      realizedExpense: 0,
      projectedIncome: 0,
      projectedExpense: 0,
    });
    value.financialIndicators.result = {
      totalIncome: 0,
      totalExpense: 0,
      projectedResult: 0,
      marginPercentage: null,
      realizedIncome: 0,
      realizedExpense: 0,
      realizedResult: 0,
    };
    setReport(value);

    expect(fixture.nativeElement.textContent).toContain('Nenhum dado financeiro encontrado');
    expect(fixture.nativeElement.textContent).toContain(
      'Nenhum dado financeiro encontrado para os filtros selecionados.',
    );
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

  function cumulativeEvolutionPoint(): FinancialCumulativeEvolutionPoint {
    return {
      period: '2026-01',
      label: 'Jan',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      cumulativeIncome: 100000,
      cumulativeExpense: 80000,
    };
  }
});
