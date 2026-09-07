import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { FarmAccessResponse } from '../../core/models/farm-access.models';
import { Farm } from '../../core/models/farm.models';
import {
  CashFlowResponse,
  FinancialAlerts,
  FinancialSummary,
  FinancialTransaction,
} from '../../core/models/financial.models';
import { DashboardHarvestSeason } from '../../core/models/harvest-season.models';
import { PageResponse } from '../../core/models/page-response.model';
import { AiTransactionService } from '../../core/services/ai-transaction.service';
import { DashboardAiTransactionActionService } from '../../core/services/dashboard-ai-transaction-action.service';
import { FinancialCategoryService } from '../../core/services/financial-category.service';
import { FinancialTransactionService } from '../../core/services/financial-transaction.service';
import { FinancialService } from '../../core/services/financial.service';
import { HarvestSeasonService } from '../../core/services/harvest-season.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';

import { DashboardPage } from './dashboard-page';

@Component({
  template: '',
})
class RouteStub {}

const farms: Farm[] = [
  {
    id: 1,
    name: 'Fazenda Boa Safra',
    document: null,
    city: 'Ribeirão Preto',
    state: 'SP',
    totalArea: 120,
    productionType: 'AGRICULTURE',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Sítio Santa Clara',
    document: null,
    city: 'Uberaba',
    state: 'MG',
    totalArea: 80,
    productionType: 'MIXED',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

function farmAccess(farmId: number, canViewFinancial = true): FarmAccessResponse {
  return {
    farmId,
    farmName: farms.find((farm) => farm.id === farmId)?.name ?? 'Fazenda',
    userId: 1,
    userType: 'USER',
    role: 'PRODUCER',
    permissions: {
      canViewFarm: true,
      canEditFarm: true,
      canChangeFarmStatus: false,
      canManageFarmUsers: true,
      canViewFinancial,
      canManageTransactions: true,
      canManageCategories: true,
      canManageGlobalCategories: false,
      canCreateFarm: false,
    },
  };
}

const summary: FinancialSummary = {
  farmId: 1,
  currentBalance: 1000,
  expectedIncome: 500,
  expectedExpense: 300,
  projectedBalance: 1200,
  payableNext30Days: 200,
  overdueExpenses: 100,
  receivableNext30Days: 400,
  cashFlowNext30Days: 100,
};

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

const cashFlow: CashFlowResponse = {
  farmId: 1,
  year: new Date().getFullYear(),
  openingBalance: 1000,
  closingBalance: 1500,
  points: [
    { month: 1, label: 'Jan', income: 1000, expense: 500, netFlow: 500, balance: 1500 },
  ],
};

const alerts: FinancialAlerts = {
  farmId: 1,
  overdueBills: [
    {
      transactionId: 101,
      description: 'Boleto fornecedor AgroSul',
      categoryName: 'Insumos',
      amount: 3200,
      dueDate: '2026-07-02',
      daysOverdue: 3,
    },
  ],
  dueToday: { count: 1, totalAmount: 1850 },
  dueNext7Days: { count: 5, totalAmount: 7400 },
};

const dashboardHarvests: readonly DashboardHarvestSeason[] = [
  {
    id: 25, farmId: 1, name: 'Café 2026/2027', status: 'IN_PROGRESS', productionActivityId: 25, productionActivityName: 'Café',
    realized: { cost: 40000, revenue: 50000, profit: 10000 }, projection: { cost: 68000, revenue: 132000, profit: 64000 },
    dueNext7Days: { count: 2, totalAmount: 12500 }, overdue: { count: 0, totalAmount: 0 },
  },
  {
    id: 26, farmId: 1, name: 'Tomate 2025/2026', status: 'IN_PROGRESS', productionActivityId: 26, productionActivityName: 'Tomate',
    realized: { cost: 102700, revenue: 30500, profit: -72200 }, projection: { cost: 136100, revenue: 88500, profit: -47600 },
    dueNext7Days: { count: 3, totalAmount: 33400 }, overdue: { count: 2, totalAmount: 27100 },
  },
  {
    id: 27, farmId: 1, name: 'Milho 2024/2025', status: 'IN_PROGRESS', productionActivityId: 27, productionActivityName: 'Milho',
    realized: { cost: 175900, revenue: 129000, profit: -46900 }, projection: { cost: 205000, revenue: 230000, profit: 25000 },
    dueNext7Days: { count: 1, totalAmount: 8500 }, overdue: { count: 1, totalAmount: 5900 },
  },
];

function pageResponse<T>(content: T[]): PageResponse<T> {
  return {
    content,
    page: 0,
    size: 5,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    first: true,
    last: true,
  };
}

function textContent(fixture: ComponentFixture<DashboardPage>): string {
  return (fixture.nativeElement.textContent as string).replace(/\u00a0/g, ' ');
}

describe('DashboardPage', () => {
  let aiTransactionService: {
    parseTransactionText: ReturnType<typeof vi.fn>;
  };
  let dashboardAiTransactionAction: DashboardAiTransactionActionService;
  let categoryService: {
    listByFarm: ReturnType<typeof vi.fn>;
  };
  let transactionService: {
    create: ReturnType<typeof vi.fn>;
  };
  let financialService: {
    getSummary: ReturnType<typeof vi.fn>;
    getAlerts: ReturnType<typeof vi.fn>;
    getCashFlow: ReturnType<typeof vi.fn>;
    getLatestTransactions: ReturnType<typeof vi.fn>;
    getUpcomingBills: ReturnType<typeof vi.fn>;
  };
  let harvestSeasonService: {
    listSummary: ReturnType<typeof vi.fn>;
    getDashboardHarvests: ReturnType<typeof vi.fn>;
    compareHarvestSeasons: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
  };
  let farmAccessStore: FarmAccessStore;
  let selectedFarmStore: SelectedFarmStore;
  let sessionStore: SessionStore;

  beforeEach(async () => {
    aiTransactionService = {
      parseTransactionText: vi.fn().mockReturnValue(of({
        farmId: 1,
        type: 'EXPENSE',
        amount: 250,
        description: 'Adubo',
        transactionDate: '2026-07-06',
        dueDate: null,
        paymentStatus: 'PAID',
        paymentMethod: 'PIX',
        categoryName: 'Insumos',
        harvestSeasonName: 'Milho',
        confidence: 0.87,
        missingFields: [],
        warnings: [],
      })),
    };
    categoryService = {
      listByFarm: vi.fn().mockReturnValue(of([
        {
          id: 10,
          name: 'Insumos',
          type: 'EXPENSE',
          farmId: 1,
          farmName: 'Fazenda Boa Safra',
          status: 'ACTIVE',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ])),
    };
    transactionService = {
      create: vi.fn().mockReturnValue(of(transaction)),
    };
    financialService = {
      getSummary: vi.fn().mockReturnValue(of(summary)),
      getAlerts: vi.fn().mockReturnValue(of(alerts)),
      getCashFlow: vi.fn().mockReturnValue(of(cashFlow)),
      getLatestTransactions: vi.fn().mockReturnValue(of(pageResponse([transaction]))),
      getUpcomingBills: vi.fn(),
    };
    harvestSeasonService = {
      listSummary: vi.fn(),
      getDashboardHarvests: vi.fn().mockReturnValue(of(dashboardHarvests)),
      compareHarvestSeasons: vi.fn(),
      list: vi.fn().mockReturnValue(of(pageResponse([
        {
          id: 20,
          farmId: 1,
          farmName: 'Fazenda Boa Safra',
          productionActivityId: 2,
          productionActivityName: 'Milho',
          name: 'Safra Milho 2026',
          startDate: '2026-01-01',
          endDate: null,
          status: 'IN_PROGRESS',
        },
      ]))),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideGestaoDiretaIcons(),
        provideRouter([
          { path: 'transactions', component: RouteStub },
          { path: 'upcoming-bills', component: RouteStub },
          { path: 'harvests', component: RouteStub },
          { path: 'harvests/:id', component: RouteStub },
        ]),
        { provide: AiTransactionService, useValue: aiTransactionService },
        { provide: FinancialCategoryService, useValue: categoryService },
        { provide: FinancialTransactionService, useValue: transactionService },
        { provide: FinancialService, useValue: financialService },
        { provide: HarvestSeasonService, useValue: harvestSeasonService },
      ],
    }).compileComponents();

    dashboardAiTransactionAction = TestBed.inject(DashboardAiTransactionActionService);
    farmAccessStore = TestBed.inject(FarmAccessStore);
    selectedFarmStore = TestBed.inject(SelectedFarmStore);
    sessionStore = TestBed.inject(SessionStore);
    farmAccessStore.clear();
    selectedFarmStore.clear();
    sessionStore.clear();
    sessionStore.setUser({
      id: 1,
      name: 'Maria Silva',
      email: 'maria@example.com',
      document: null,
      userType: 'ADMIN',
      status: 'ACTIVE',
    });
  });

  afterEach(() => {
    farmAccessStore.clear();
    selectedFarmStore.clear();
    sessionStore.clear();
  });

  it('should open the harvest comparison drawer from the dashboard action', () => {
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    findButton(fixture, 'Comparar safras')?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Compare indicadores financeiros e produtivos entre as Safras selecionadas.',
    );
  });

  it('should render greeting and empty state without calling dashboard endpoints', () => {
    sessionStore.setUser({
      id: 1,
      name: 'Maria Silva',
      email: 'maria@example.com',
      document: null,
      userType: 'ADMIN',
      status: 'ACTIVE',
    });

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    expect(textContent(fixture)).toContain('Nenhuma fazenda selecionada');
    expect(financialService.getSummary).not.toHaveBeenCalled();
    expect(financialService.getAlerts).not.toHaveBeenCalled();
    expect(financialService.getCashFlow).not.toHaveBeenCalled();
    expect(financialService.getCashFlow).not.toHaveBeenCalled();
    expect(financialService.getLatestTransactions).not.toHaveBeenCalled();
    expect(financialService.getUpcomingBills).not.toHaveBeenCalled();
    expect(harvestSeasonService.listSummary).not.toHaveBeenCalled();
  });

  it('should call endpoints and render dashboard data when there is a selected farm', () => {
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));
    sessionStore.setUser({
      id: 1,
      name: 'Maria Silva',
      email: 'maria@example.com',
      document: null,
      userType: 'ADMIN',
      status: 'ACTIVE',
    });

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    expect(financialService.getSummary).toHaveBeenCalledWith(1);
    expect(financialService.getAlerts).toHaveBeenCalledWith(1);
    expect(financialService.getCashFlow).toHaveBeenCalledWith(1, new Date().getFullYear());
    expect(financialService.getLatestTransactions).toHaveBeenCalledWith(1);
    expect(financialService.getUpcomingBills).not.toHaveBeenCalled();
    expect(harvestSeasonService.listSummary).not.toHaveBeenCalled();
    expect(harvestSeasonService.getDashboardHarvests).toHaveBeenCalledWith(1);

    const text = textContent(fixture);
    const summaryCards = Array.from(
      fixture.nativeElement.querySelectorAll('gd-summary-card') as NodeListOf<HTMLElement>,
    ).map((card) => card.textContent?.replace(/\u00a0/g, ' ') ?? '');

    expect(summaryCards).toHaveLength(8);
    expect(summaryCards[0]).toContain('Saldo atual');
    expect(summaryCards[0]).toContain('R$ 1.000,00');
    expect(summaryCards[1]).toContain('Entradas previstas');
    expect(summaryCards[1]).toContain('R$ 500,00');
    expect(summaryCards[2]).toContain('Saídas previstas');
    expect(summaryCards[2]).toContain('R$ 300,00');
    expect(summaryCards[3]).toContain('Saldo projetado');
    expect(summaryCards[3]).toContain('R$ 1.200,00');
    expect(summaryCards[4]).toContain('A pagar em 30 dias');
    expect(summaryCards[4]).toContain('R$ 200,00');
    expect(summaryCards[5]).toContain('Atrasado');
    expect(summaryCards[5]).toContain('R$ 100,00');
    expect(summaryCards[6]).toContain('A receber');
    expect(summaryCards[6]).toContain('R$ 400,00');
    expect(summaryCards[7]).toContain('Fluxo 30 dias');
    expect(summaryCards[7]).toContain('R$ 100,00');
    expect(summaryCards.some((card) => card.includes('Pendências'))).toBe(false);
    expect(text).toContain('Venda de soja');
    expect(text).toContain('Alertas importantes');
    expect(text).toContain('Boleto fornecedor AgroSul');
    expect(text).toContain('1 conta a pagar no valor total de R$ 1.850,00');
    expect(text).not.toContain('Contas a vencer');
    expect(text).not.toContain('1 conta(s) somando');
    const dashboardContent = fixture.nativeElement.querySelector(':scope > section') as HTMLElement;
    const harvestSection = fixture.nativeElement.querySelector(
      'section[aria-labelledby="in-progress-harvests-title"]',
    ) as HTMLElement;
    const harvestCard = harvestSection.closest('gd-card') as HTMLElement;
    const cashFlowSection = fixture.nativeElement.querySelector('section[aria-labelledby="cash-flow-title"]') as HTMLElement;
    const cashFlowCard = cashFlowSection.closest('gd-card') as HTMLElement;
    const latestTransactions = dashboardContent.querySelector('gd-latest-transactions-card') as HTMLElement;
    const layoutGrid = latestTransactions.parentElement as HTMLElement;
    const importantAlerts = layoutGrid.querySelector('gd-important-alerts') as HTMLElement;
    const cashFlowChart = cashFlowCard.querySelector('gd-cash-flow-chart') as HTMLElement;

    expect(dashboardContent.className).toContain('space-y-6');
    expect(importantAlerts.className).toContain('block');
    expect(layoutGrid.className).toContain('grid-cols-1');
    expect(layoutGrid.className).toContain('items-stretch');
    expect(layoutGrid.className).toContain('xl:grid-cols-3');
    expect(cashFlowCard.previousElementSibling?.className).toContain('xl:grid-cols-4');
    expect(cashFlowCard.nextElementSibling).toBe(layoutGrid);
    expect(layoutGrid.nextElementSibling).toBe(harvestCard);
    expect(latestTransactions.className).toContain('order-2');
    expect(latestTransactions.className).toContain('h-full');
    expect(latestTransactions.className).toContain('xl:order-1');
    expect(latestTransactions.className).toContain('xl:col-span-2');
    expect(harvestCard.className).toContain('w-full');
    expect(harvestCard.className).not.toContain('xl:col-span-2');
    expect(importantAlerts.className).toContain('h-full');
    expect(importantAlerts.className).toContain('order-1');
    expect(importantAlerts.className).toContain('xl:order-2');
    expect(importantAlerts.className).toContain('xl:col-span-1');
    expect(cashFlowCard.textContent).toContain('Fluxo de Caixa');
    expect(fixture.nativeElement.querySelector('gd-upcoming-bills-card')).toBeNull();
  });

  it('should render nine cash flow years around the current year in ascending order', () => {
    const currentYear = new Date().getFullYear();
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('#cash-flow-year') as HTMLSelectElement;
    const years = Array.from(select.options, (option) => option.value);

    expect(select.value).toBe(String(currentYear));
    expect(years).toHaveLength(9);
    expect(years[0]).toBe(String(currentYear - 4));
    expect(years[8]).toBe(String(currentYear + 4));
    expect(years).toContain(String(currentYear));
    expect(years.every((year) => Number(year) > 0)).toBe(true);
    expect(years).not.toContain('');
  });

  it('should reload only cash flow when selecting the first and last available years', () => {
    const currentYear = new Date().getFullYear();
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    const summaryCalls = financialService.getSummary.mock.calls.length;
    const alertsCalls = financialService.getAlerts.mock.calls.length;
    const transactionsCalls = financialService.getLatestTransactions.mock.calls.length;
    const harvestsCalls = harvestSeasonService.getDashboardHarvests.mock.calls.length;
    const select = fixture.nativeElement.querySelector('#cash-flow-year') as HTMLSelectElement;

    select.value = String(currentYear - 4);
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(financialService.getCashFlow).toHaveBeenLastCalledWith(1, currentYear - 4);

    select.value = String(currentYear + 4);
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(financialService.getCashFlow).toHaveBeenLastCalledWith(1, currentYear + 4);
    expect(financialService.getCashFlow).toHaveBeenCalledTimes(3);
    expect(financialService.getSummary).toHaveBeenCalledTimes(summaryCalls);
    expect(financialService.getAlerts).toHaveBeenCalledTimes(alertsCalls);
    expect(financialService.getLatestTransactions).toHaveBeenCalledTimes(transactionsCalls);
    expect(harvestSeasonService.getDashboardHarvests).toHaveBeenCalledTimes(harvestsCalls);
  });

  it("should render dashboard harvest cards with financial comparisons and tooltips", () => {
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    const text = textContent(fixture);
    const harvestSection = fixture.nativeElement.querySelector(
      'section[aria-labelledby="in-progress-harvests-title"]',
    ) as HTMLElement;
    const harvestCard = harvestSection.closest('gd-card') as HTMLElement;
    const harvestContainer = harvestCard.firstElementChild as HTMLElement;
    const harvestHeader = harvestSection.firstElementChild as HTMLElement;
    const harvestScroller = harvestSection.querySelector(':scope > div:last-child > div') as HTMLElement;
    const harvestList = harvestScroller.firstElementChild as HTMLElement;
    const harvestCards = Array.from(harvestList.querySelectorAll('article')) as HTMLElement[];
    const anchors = Array.from(fixture.nativeElement.querySelectorAll("a")) as HTMLAnchorElement[];
    const tooltips = Array.from(
      fixture.nativeElement.querySelectorAll("gd-tooltip [role=tooltip]") as NodeListOf<HTMLElement>,
    );
    const indicatorStrips = Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="harvest-bills-indicators"]') as NodeListOf<HTMLElement>,
    );
    const indicatorTriggers = Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="harvest-bills-indicators"] > gd-tooltip') as NodeListOf<HTMLElement>,
    );
    const negativeProfit = fixture.nativeElement.querySelector("span.text-danger") as HTMLElement;
    const positiveProfit = Array.from(
      fixture.nativeElement.querySelectorAll("span.text-success") as NodeListOf<HTMLElement>,
    ).find((value) => value.textContent?.replace(/\u00a0/g, " ").includes("R$ 64.000,00")) as HTMLElement;

    expect(text).toContain("Safras em andamento");
    expect(harvestCard.className).toContain('gd-fade-in-up');
    expect(harvestCard.className).toContain('block');
    expect(harvestCard.className).toContain('w-full');
    expect(harvestContainer.className).toContain('rounded-app');
    expect(harvestContainer.className).toContain('bg-surface');
    expect(harvestContainer.className).toContain('border-border');
    expect(harvestContainer.className).toContain('p-5');
    expect(harvestContainer.className).toContain('sm:hover:shadow-md');
    expect(harvestHeader.className).toContain('flex');
    expect(harvestHeader.className).toContain('w-full');
    expect(harvestHeader.className).toContain('sm:justify-between');
    expect(harvestScroller.className).toContain('overflow-x-auto');
    expect(harvestScroller.className).toContain('overscroll-x-contain');
    expect(harvestList.className).toContain('flex');
    expect(harvestList.className).toContain('min-w-max');
    expect(harvestCards).toHaveLength(3);
    expect(harvestCards.every((card) => card.className.includes('w-[300px]'))).toBe(true);
    expect(harvestCards.every((card) => card.className.includes('shrink-0'))).toBe(true);
    expect(text).toContain("Café 2026/2027");
    expect(text).toContain("Tomate 2025/2026");
    expect(text).toContain("Milho 2024/2025");
    expect(text).toContain("Café");
    expect(text).toContain("Tomate");
    expect(text).toContain("Milho");
    expect(text.match(/Em andamento/g)).toHaveLength(3);
    expect(text).toContain("Realizado");
    expect(text).toContain("Projetado");
    expect(text).toContain("R$ 40.000,00");
    expect(text).toContain("R$ 68.000,00");
    expect(text).toContain("R$ 50.000,00");
    expect(text).toContain("R$ 132.000,00");
    expect(text).toContain("-R$ 72.200,00");
    expect(text).toContain("R$ 25.000,00");
    expect(negativeProfit.textContent?.replace(/\u00a0/g, " ")).toContain("-R$ 72.200,00");
    expect(positiveProfit.textContent?.replace(/\u00a0/g, " ")).toContain("R$ 64.000,00");
    expect(text).toContain("Próximos 7 dias");
    expect(text).toContain("Atrasadas");
    expect(indicatorStrips).toHaveLength(3);
    expect(indicatorStrips[0].className).toContain("w-full");
    expect(indicatorStrips[0].className).toContain("grid-cols-2");
    expect(indicatorStrips[0].className).toContain("gap-3");
    expect(indicatorStrips[0].className).not.toContain("divide-x");
    expect(indicatorStrips[0].className).not.toContain("overflow-hidden");
    expect(indicatorTriggers).toHaveLength(6);
    expect(indicatorTriggers.every((trigger) => trigger.className.includes("w-full"))).toBe(true);
    expect(indicatorTriggers.every((trigger) => trigger.className.includes("min-w-0"))).toBe(true);
    expect(indicatorTriggers.every((trigger) => trigger.className.includes("focus-visible:outline"))).toBe(true);
    expect(indicatorTriggers[0].getAttribute("aria-label")).toContain("Vencem entre hoje e os próximos 7 dias.");
    expect((indicatorTriggers[0].firstElementChild as HTMLElement).textContent?.replace(/\u00a0/g, " ")).not.toContain("R$ 12.500,00");
    expect((indicatorTriggers[0].firstElementChild as HTMLElement).className).toContain("bg-amber-50");
    expect((indicatorTriggers[0].firstElementChild as HTMLElement).className).toContain("rounded-app");
    expect((indicatorTriggers[0].firstElementChild as HTMLElement).className).toContain("items-center");
    expect((indicatorTriggers[1].firstElementChild as HTMLElement).className).toContain("bg-background");
    expect((indicatorTriggers[2].firstElementChild as HTMLElement).className).toContain("bg-amber-50");
    expect((indicatorTriggers[3].firstElementChild as HTMLElement).className).toContain("bg-red-50");
    expect(tooltips).toHaveLength(6);
    expect(tooltips[0].textContent?.replace(/\u00a0/g, " ")).toContain("2 contas a pagar");
    expect(tooltips[0].textContent?.replace(/\u00a0/g, " ")).toContain("Total: R$ 12.500,00");
    expect(tooltips[1].textContent).toContain("Nenhuma conta atrasada.");
    expect(tooltips[3].textContent?.replace(/\u00a0/g, " ")).toContain("2 contas atrasadas");
    expect(tooltips[3].textContent?.replace(/\u00a0/g, " ")).toContain("Total: R$ 27.100,00");
    expect(text).not.toContain("Pendentes");
    expect(text).not.toContain("Movimentações");
    expect(text).not.toContain("Pendências abertas");
    expect(text).not.toContain("Possui atrasos");
    expect(anchors.some((anchor) => anchor.textContent?.includes("Ver todas") && anchor.getAttribute("href") === "/harvests")).toBe(true);
    expect(anchors.some((anchor) => anchor.textContent?.includes("Ver detalhes") && anchor.getAttribute("href") === "/harvests/25")).toBe(true);
    expect(anchors.some((anchor) => anchor.textContent?.includes("Ver detalhes") && anchor.getAttribute("href") === "/harvests/26")).toBe(true);
    expect(anchors.some((anchor) => anchor.textContent?.includes("Ver detalhes") && anchor.getAttribute("href") === "/harvests/27")).toBe(true);
    expect(harvestSeasonService.listSummary).not.toHaveBeenCalled();
  });

  it("should render skeletons while dashboard harvests load", () => {
    const harvests = new Subject<readonly DashboardHarvestSeason[]>();
    harvestSeasonService.getDashboardHarvests.mockReturnValueOnce(harvests);
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    const harvestSection = fixture.nativeElement.querySelector(
      'section[aria-labelledby="in-progress-harvests-title"]',
    ) as HTMLElement;
    const harvestCard = harvestSection.closest('gd-card') as HTMLElement;
    const harvestScroller = harvestSection.querySelector(':scope > div:last-child > div') as HTMLElement;
    const harvestList = harvestScroller.firstElementChild as HTMLElement;
    const skeletonCards = Array.from(harvestList.children) as HTMLElement[];

    expect(fixture.nativeElement.querySelectorAll("gd-skeleton").length).toBeGreaterThan(0);
    expect(harvestCard.className).toContain('w-full');
    expect(harvestScroller.className).toContain('overflow-x-auto');
    expect(harvestScroller.className).toContain('overscroll-x-contain');
    expect(harvestList.className).toContain('flex');
    expect(harvestList.className).toContain('min-w-max');
    expect(skeletonCards).toHaveLength(3);
    expect(skeletonCards.every((card) => card.className.includes('w-[300px]'))).toBe(true);
    expect(skeletonCards.every((card) => card.className.includes('shrink-0'))).toBe(true);
    expect(textContent(fixture)).not.toContain("Café 2026/2027");
  });

  it("should render an empty state when the dashboard endpoint returns no harvests", () => {
    harvestSeasonService.getDashboardHarvests.mockReturnValueOnce(of([]));
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    expect(textContent(fixture)).toContain("Nenhuma safra em andamento");
    expect(textContent(fixture)).toContain("Não há safras em andamento para a fazenda selecionada.");
  });

  it("should isolate dashboard harvest errors and retry only this section", () => {
    harvestSeasonService.getDashboardHarvests
      .mockReturnValueOnce(throwError(() => new Error("harvests")))
      .mockReturnValueOnce(of(dashboardHarvests));
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    expect(textContent(fixture)).toContain("Não foi possível carregar as safras em andamento.");
    expect(textContent(fixture)).toContain("Saldo atual");
    const retryButton = findButton(fixture, "Tentar novamente");
    retryButton?.click();
    fixture.detectChanges();

    expect(harvestSeasonService.getDashboardHarvests).toHaveBeenCalledTimes(2);
    expect(textContent(fixture)).toContain("Café 2026/2027");
  });

  it('should reload dashboard and harvest data when the global farm selection changes', () => {
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    selectedFarmStore.selectFarmById(2);
    fixture.detectChanges();
    farmAccessStore.setAccess(farmAccess(2));
    fixture.detectChanges();

    expect(financialService.getSummary).toHaveBeenCalledWith(1);
    expect(financialService.getSummary).toHaveBeenCalledWith(2);
    expect(financialService.getAlerts).toHaveBeenCalledWith(1);
    expect(financialService.getAlerts).toHaveBeenCalledWith(2);
    expect(financialService.getCashFlow).toHaveBeenCalledWith(2, new Date().getFullYear());
    expect(financialService.getLatestTransactions).toHaveBeenCalledWith(2);
    expect(financialService.getUpcomingBills).not.toHaveBeenCalled();
    expect(harvestSeasonService.listSummary).not.toHaveBeenCalled();
    expect(harvestSeasonService.getDashboardHarvests).toHaveBeenCalledWith(1);
    expect(harvestSeasonService.getDashboardHarvests).toHaveBeenCalledWith(2);
  });

  it('should not call dashboard endpoints) without financial permission', () => {
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1, false));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    expect(financialService.getSummary).not.toHaveBeenCalled();
    expect(financialService.getAlerts).not.toHaveBeenCalled();
    expect(financialService.getCashFlow).not.toHaveBeenCalled();
    expect(financialService.getLatestTransactions).not.toHaveBeenCalled();
    expect(financialService.getUpcomingBills).not.toHaveBeenCalled();
    expect(harvestSeasonService.listSummary).not.toHaveBeenCalled();
    expect(textContent(fixture)).toContain(
      'Você não tem permissão para visualizar os dados financeiros desta fazenda.',
    );
  });

  it('should remove the permanent quick transaction card and open the IA drawer on request', () => {
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    expect(textContent(fixture)).not.toContain('Movimentação rápida');
    expect(fixture.nativeElement.querySelector('#quick-transaction-text')).toBeNull();

    dashboardAiTransactionAction.requestOpen();
    fixture.detectChanges();

    const text = textContent(fixture);
    expect(text).toContain('Nova movimentação com IA');
    expect(text).toContain('Descrição da movimentação');
    expect(text).toContain('Interpretar');
    expect(fixture.nativeElement.querySelector('#quick-transaction-text')).not.toBeNull();
  });

  it('should not open the IA drawer without transaction management permission', () => {
    sessionStore.setUser({
      id: 2,
      name: 'Contador',
      email: 'contador@example.com',
      document: null,
      userType: 'USER',
      status: 'ACTIVE',
    });
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess({
      ...farmAccess(1),
      role: 'ACCOUNTANT',
      permissions: { ...farmAccess(1).permissions, canManageTransactions: false },
    });

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    dashboardAiTransactionAction.requestOpen();
    fixture.detectChanges();

    expect(textContent(fixture)).not.toContain('Nova movimentação com IA');
    expect(fixture.nativeElement.querySelector('#quick-transaction-text')).toBeNull();
    expect(aiTransactionService.parseTransactionText).not.toHaveBeenCalled();
  });

  it('should keep Interpretar disabled until text is filled', () => {
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    dashboardAiTransactionAction.requestOpen();
    fixture.detectChanges();

    expect(findButton(fixture, 'Interpretar')?.disabled).toBe(true);

    setTextarea(fixture, 'paguei 250 reais de adubo');

    expect(findButton(fixture, 'Interpretar')?.disabled).toBe(false);
  });

  it('should not call AI service without selected farm', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    dashboardHarness(fixture).parseQuickTransaction();

    expect(aiTransactionService.parseTransactionText).not.toHaveBeenCalled();
    expect(dashboardHarness(fixture).quickTransactionError()).toBe(
      'Selecione uma fazenda para usar a movimentação rápida.',
    );
  });

  it('should not call AI service with empty text', () => {
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    dashboardHarness(fixture).parseQuickTransaction();

    expect(aiTransactionService.parseTransactionText).not.toHaveBeenCalled();
    expect(dashboardHarness(fixture).quickTransactionError()).toBe('Informe o texto da movimentação.');
  });

  it('should parse quick transaction, map category and harvest season, and not save automatically', () => {
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    dashboardAiTransactionAction.requestOpen();
    fixture.detectChanges();

    setTextarea(fixture, 'paguei 250 reais de adubo para milho ontem no pix');
    const interpretButton = findButton(fixture, 'Interpretar');

    expect(interpretButton?.disabled).toBe(false);
    expect(interpretButton?.type).toBe('button');

    interpretButton?.click();
    fixture.detectChanges();

    expect(aiTransactionService.parseTransactionText).toHaveBeenCalledWith({
      farmId: 1,
      text: 'paguei 250 reais de adubo para milho ontem no pix',
    });
    expect(categoryService.listByFarm).toHaveBeenCalledWith(1, { status: 'ACTIVE' });
    expect(harvestSeasonService.list).toHaveBeenCalledWith(expect.objectContaining({ farmId: 1 }));
    expect(transactionService.create).not.toHaveBeenCalled();

    expect(dashboardHarness(fixture).quickTransactionDraft()).toEqual(expect.objectContaining({
      description: 'Adubo',
      amount: 250,
      type: 'EXPENSE',
      status: 'PAID',
      paymentMethod: 'PIX',
      transactionDate: '2026-07-06',
      categoryId: 10,
      harvestSeasonId: 20,
    }));
  });

  it('should show warnings when category and harvest season are not found', () => {
    aiTransactionService.parseTransactionText.mockReturnValueOnce(of({
      farmId: 1,
      type: 'EXPENSE',
      amount: 250,
      description: 'Adubo',
      transactionDate: null,
      dueDate: null,
      paymentStatus: 'PAID',
      paymentMethod: 'PIX',
      categoryName: 'Categoria inexistente',
      harvestSeasonName: 'Safra inexistente',
      confidence: 0.4,
      missingFields: [],
      warnings: ['Revise o valor sugerido.'],
    }));
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    setTextarea(fixture, 'paguei adubo');
    dashboardHarness(fixture).parseQuickTransaction();
    fixture.detectChanges();

    const text = dashboardHarness(fixture).quickTransactionWarnings().join(' ');
    expect(text).toContain('Categoria sugerida pela IA não encontrada: "Categoria inexistente".');
    expect(text).toContain('Safra sugerida pela IA não encontrada: "Safra inexistente".');
    expect(text).toContain('Data não identificada, usando data atual.');
    expect(text).toContain('A interpretação pode estar incompleta. Revise os campos.');
    expect(text).toContain('Revise o valor sugerido.');
  });

  it('should save quick transaction only after drawer form submit and reload dashboard', () => {
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    setTextarea(fixture, 'paguei 250 reais de adubo para milho ontem no pix');
    const harness = dashboardHarness(fixture);
    harness.parseQuickTransaction();
    fixture.detectChanges();
    harness.saveQuickTransaction(harness.quickTransactionDraft());
    fixture.detectChanges();

    expect(transactionService.create).toHaveBeenCalledWith(expect.objectContaining({
      farmId: 1,
      description: 'Adubo',
      amount: 250,
      categoryId: 10,
      harvestSeasonId: 20,
    }));
    expect(financialService.getSummary).toHaveBeenCalledTimes(2);
    expect(dashboardHarness(fixture).quickTransactionControl.value).toBe('');
  });

  it('should show friendly parse error for 422', () => {
    aiTransactionService.parseTransactionText.mockReturnValueOnce(throwError(() => ({ status: 422 })));
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    setTextarea(fixture, 'texto inválido');
    dashboardHarness(fixture).parseQuickTransaction();
    fixture.detectChanges();

    expect(dashboardHarness(fixture).quickTransactionError()).toContain(
      'Não foi possível interpretar o texto como movimentação. Tente informar valor, data e forma de pagamento.',
    );
  });

  it('should render section error states when financial API calls fail', () => {
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));
    financialService.getSummary.mockReturnValueOnce(throwError(() => new Error('summary')));
    financialService.getAlerts.mockReturnValueOnce(throwError(() => new Error('alerts')));
    financialService.getLatestTransactions.mockReturnValueOnce(
      throwError(() => new Error('transactions')),
    );

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    const text = textContent(fixture);
    expect(text).toContain('Erro ao carregar resumo');
    expect(text).toContain('Erro ao carregar alertas');
    expect(text).toContain('Erro ao carregar movimentações');
    expect(text).toContain('Safras em andamento');
    expect(text).toContain('Café 2026/2027');
  });
});


function setTextarea(fixture: ComponentFixture<DashboardPage>, value: string): void {
  dashboardHarness(fixture).quickTransactionControl.setValue(value);
  fixture.detectChanges();
}

function findButton(fixture: ComponentFixture<DashboardPage>, label: string): HTMLButtonElement | null {
  return (
    Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((button) => button.textContent?.includes(label)) ?? null
  );
}

function dashboardHarness(fixture: ComponentFixture<DashboardPage>): {
  parseQuickTransaction: () => void;
  saveQuickTransaction: (payload: unknown) => void;
  quickTransactionControl: { value: unknown; setValue: (value: string) => void };
  quickTransactionDraft: () => unknown;
  quickTransactionError: () => string | null;
  quickTransactionWarnings: () => readonly string[];
} {
  return fixture.componentInstance as unknown as {
    parseQuickTransaction: () => void;
    saveQuickTransaction: (payload: unknown) => void;
    quickTransactionControl: { value: unknown; setValue: (value: string) => void };
    quickTransactionDraft: () => unknown;
    quickTransactionError: () => string | null;
    quickTransactionWarnings: () => readonly string[];
  };
}
