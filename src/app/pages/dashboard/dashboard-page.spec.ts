import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { FarmAccessResponse } from '../../core/models/farm-access.models';
import { Farm } from '../../core/models/farm.models';
import {
  FinancialSummary,
  FinancialTransaction,
  UpcomingBill,
} from '../../core/models/financial.models';
import { HarvestSeasonSummaryListItem } from '../../core/models/harvest-season.models';
import { PageResponse } from '../../core/models/page-response.model';
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

const bill: UpcomingBill = {
  id: 1,
  description: 'Conta de energia',
  amount: 320,
  status: 'PENDING',
  dueDate: '2026-01-20',
  farmId: 1,
  categoryId: 2,
  categoryName: 'Energia',
};

const harvest: HarvestSeasonSummaryListItem = {
  id: 10,
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  productionActivityId: 2,
  productionActivityName: 'Soja',
  name: 'Safra Soja 2026',
  description: null,
  startDate: '2026-01-01',
  endDate: null,
  expectedCost: 9000,
  expectedRevenue: 18000,
  expectedProfit: 9000,
  areaHectares: 50,
  status: 'IN_PROGRESS',
  realizedCost: 4200,
  realizedRevenue: 9500,
  realizedProfit: 5300,
  pendingExpenses: 2,
  overdueExpenses: 1,
  pendingRevenue: 0,
  transactionCount: 7,
  incomeCount: 3,
  expenseCount: 4,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-10T00:00:00Z',
};

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
  let financialService: {
    getSummary: ReturnType<typeof vi.fn>;
    getLatestTransactions: ReturnType<typeof vi.fn>;
    getUpcomingBills: ReturnType<typeof vi.fn>;
  };
  let harvestSeasonService: {
    listSummary: ReturnType<typeof vi.fn>;
  };
  let farmAccessStore: FarmAccessStore;
  let selectedFarmStore: SelectedFarmStore;
  let sessionStore: SessionStore;

  beforeEach(async () => {
    financialService = {
      getSummary: vi.fn().mockReturnValue(of(summary)),
      getLatestTransactions: vi.fn().mockReturnValue(of(pageResponse([transaction]))),
      getUpcomingBills: vi.fn().mockReturnValue(of(pageResponse([bill]))),
    };
    harvestSeasonService = {
      listSummary: vi.fn().mockReturnValue(of(pageResponse([harvest]))),
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
        { provide: FinancialService, useValue: financialService },
        { provide: HarvestSeasonService, useValue: harvestSeasonService },
      ],
    }).compileComponents();

    farmAccessStore = TestBed.inject(FarmAccessStore);
    selectedFarmStore = TestBed.inject(SelectedFarmStore);
    sessionStore = TestBed.inject(SessionStore);
    farmAccessStore.clear();
    selectedFarmStore.clear();
    sessionStore.clear();
  });

  afterEach(() => {
    farmAccessStore.clear();
    selectedFarmStore.clear();
    sessionStore.clear();
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
    expect(financialService.getLatestTransactions).toHaveBeenCalledWith(1);
    expect(financialService.getUpcomingBills).toHaveBeenCalledWith(1);
    expect(harvestSeasonService.listSummary).toHaveBeenCalledWith({
      farmId: 1,
      status: 'IN_PROGRESS',
      page: 0,
      size: 3,
      sort: 'startDate',
      direction: 'DESC',
    });

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
    expect(text).toContain('Conta de energia');
    expect(text).toContain('1 conta(s) somando R$ 320,00');
  });

  it('should render in-progress harvest cards and links', () => {
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    const text = textContent(fixture);
    const anchors = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];

    expect(text).toContain('Safras em andamento');
    expect(text).toContain('Acompanhe o resultado financeiro dos ciclos produtivos ativos.');
    expect(text).toContain('Safra Soja 2026');
    expect(text).toContain('Soja');
    expect(text).toContain('Em andamento');
    expect(text).toContain('Custo realizado');
    expect(text).toContain('R$ 4.200,00');
    expect(text).toContain('Receita realizada');
    expect(text).toContain('R$ 9.500,00');
    expect(text).toContain('Lucro realizado');
    expect(text).toContain('R$ 5.300,00');
    expect(text).toContain('Pendentes');
    expect(text).toContain('Atrasadas');
    expect(text).toContain('Movimentações');
    expect(text).toContain('Possui atrasos');
    expect(text).toContain('Pendências abertas');
    expect(anchors.some((anchor) => anchor.textContent?.includes('Ver todas') && anchor.getAttribute('href') === '/harvests')).toBe(true);
    expect(anchors.some((anchor) => anchor.textContent?.includes('Ver detalhes') && anchor.getAttribute('href') === '/harvests/10')).toBe(true);
  });

  it('should render empty state when there are no in-progress harvests', () => {
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));
    harvestSeasonService.listSummary.mockReturnValueOnce(of(pageResponse([])));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    const anchors = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];

    expect(textContent(fixture)).toContain('Nenhuma safra em andamento no momento.');
    expect(anchors.some((anchor) => anchor.textContent?.includes('Ver safras') && anchor.getAttribute('href') === '/harvests')).toBe(true);
  });

  it('should render harvest error state without breaking financial sections', () => {
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));
    harvestSeasonService.listSummary.mockReturnValueOnce(throwError(() => new Error('harvests')));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    const text = textContent(fixture);

    expect(text).toContain('Erro ao carregar safras');
    expect(text).toContain('Não foi possível carregar as safras em andamento.');
    expect(text).toContain('Saldo atual');
    expect(text).toContain('Venda de soja');
    expect(text).toContain('Conta de energia');
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
    expect(financialService.getLatestTransactions).toHaveBeenCalledWith(2);
    expect(financialService.getUpcomingBills).toHaveBeenCalledWith(2);
    expect(harvestSeasonService.listSummary).toHaveBeenCalledWith({
      farmId: 1,
      status: 'IN_PROGRESS',
      page: 0,
      size: 3,
      sort: 'startDate',
      direction: 'DESC',
    });
    expect(harvestSeasonService.listSummary).toHaveBeenCalledWith({
      farmId: 2,
      status: 'IN_PROGRESS',
      page: 0,
      size: 3,
      sort: 'startDate',
      direction: 'DESC',
    });
  });

  it('should not call dashboard endpoints without financial permission', () => {
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1, false));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    expect(financialService.getSummary).not.toHaveBeenCalled();
    expect(financialService.getLatestTransactions).not.toHaveBeenCalled();
    expect(financialService.getUpcomingBills).not.toHaveBeenCalled();
    expect(harvestSeasonService.listSummary).not.toHaveBeenCalled();
    expect(textContent(fixture)).toContain(
      'Você não tem permissão para visualizar os dados financeiros desta fazenda.',
    );
  });

  it('should render section error states when financial API calls fail', () => {
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));
    financialService.getSummary.mockReturnValueOnce(throwError(() => new Error('summary')));
    financialService.getLatestTransactions.mockReturnValueOnce(
      throwError(() => new Error('transactions')),
    );
    financialService.getUpcomingBills.mockReturnValueOnce(throwError(() => new Error('bills')));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    const text = textContent(fixture);
    expect(text).toContain('Erro ao carregar resumo');
    expect(text).toContain('Erro ao carregar movimentações');
    expect(text).toContain('Erro ao carregar contas');
    expect(text).toContain('Safras em andamento');
    expect(text).toContain('Safra Soja 2026');
  });
});
