import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
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
import { PageResponse } from '../../core/models/page-response.model';
import { FinancialService } from '../../core/services/financial.service';
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
  incomeTotal: 10000,
  expenseTotal: 3500,
  balance: 6500,
  pendingTotal: 1200,
  paidTotal: 7000,
  overdueTotal: 300,
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

describe('DashboardPage', () => {
  let financialService: {
    getSummary: ReturnType<typeof vi.fn>;
    getLatestTransactions: ReturnType<typeof vi.fn>;
    getUpcomingBills: ReturnType<typeof vi.fn>;
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

    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideGestaoDiretaIcons(),
        provideRouter([
          { path: 'transactions', component: RouteStub },
          { path: 'upcoming-bills', component: RouteStub },
        ]),
        { provide: FinancialService, useValue: financialService },
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

  it('should render greeting and empty state without calling financial endpoints', () => {
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

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Olá, Maria Silva');
    expect(text).toContain('Aqui está o resumo financeiro da sua fazenda hoje.');
    expect(text).toContain('Nenhuma fazenda selecionada');
    expect(financialService.getSummary).not.toHaveBeenCalled();
    expect(financialService.getLatestTransactions).not.toHaveBeenCalled();
    expect(financialService.getUpcomingBills).not.toHaveBeenCalled();
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

    const text = fixture.nativeElement.textContent as string;
    const normalizedText = text.replace(/\u00a0/g, ' ');

    expect(normalizedText).toContain('Olá, Maria Silva');
    expect(normalizedText).toContain('Saldo atual');
    expect(normalizedText).toContain('Entradas previstas');
    expect(normalizedText).toContain('Saídas previstas');
    expect(normalizedText).toContain('Saldo projetado');
    expect(normalizedText).toContain('Pendências');
    expect(normalizedText).toContain('Atrasado');
    expect(normalizedText).toContain('R$ 7.000,00');
    expect(normalizedText).toContain('Venda de soja');
    expect(normalizedText).toContain('Conta de energia');
    expect(normalizedText).toContain('1 conta(s) somando R$ 320,00');
  });

  it('should reload financial data when the global farm selection changes', () => {
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
  });

  it('should not call financial endpoints without financial permission', () => {
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1, false));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    expect(financialService.getSummary).not.toHaveBeenCalled();
    expect(financialService.getLatestTransactions).not.toHaveBeenCalled();
    expect(financialService.getUpcomingBills).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'Você não tem permissão para visualizar os dados financeiros desta fazenda.',
    );
  });

  it('should render section error states when API calls fail', () => {
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(farmAccess(1));
    financialService.getSummary.mockReturnValueOnce(throwError(() => new Error('summary')));
    financialService.getLatestTransactions.mockReturnValueOnce(
      throwError(() => new Error('transactions')),
    );
    financialService.getUpcomingBills.mockReturnValueOnce(throwError(() => new Error('bills')));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Erro ao carregar resumo');
    expect(text).toContain('Erro ao carregar movimentações');
    expect(text).toContain('Erro ao carregar contas');
  });
});
