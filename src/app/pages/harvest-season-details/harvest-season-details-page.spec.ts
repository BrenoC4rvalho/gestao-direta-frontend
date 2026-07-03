import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Mock, vi } from 'vitest';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { FinancialTransaction } from '../../core/models/financial-transaction.models';
import { HarvestSeason, HarvestSeasonSummary } from '../../core/models/harvest-season.models';
import { PageResponse } from '../../core/models/page-response.model';
import { ProductionActivity } from '../../core/models/production-activity.models';
import { FinancialTransactionService } from '../../core/services/financial-transaction.service';
import { HarvestSeasonService } from '../../core/services/harvest-season.service';
import { ProductionActivityService } from '../../core/services/production-activity.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { HarvestSeasonDetailsPage } from './harvest-season-details-page';

const harvest: HarvestSeason = {
  id: 1,
  farmId: 10,
  farmName: 'Fazenda Boa Safra',
  productionActivityId: 2,
  productionActivityName: 'Soja',
  name: 'Safra Soja 2026',
  description: 'Safra de verao',
  startDate: '2026-01-01',
  endDate: '2026-06-30',
  expectedRevenue: 150000,
  expectedCost: 90000,
  areaHectares: 120.5,
  status: 'IN_PROGRESS',
};

const summary: HarvestSeasonSummary = {
  harvestSeasonId: 1,
  harvestSeasonName: 'Safra Soja 2026',
  productionActivityId: 2,
  productionActivityName: 'Soja',
  farmId: 10,
  farmName: 'Fazenda Boa Safra',
  expectedCost: 90000,
  expectedRevenue: 150000,
  expectedProfit: 60000,
  realizedCost: 72500,
  realizedRevenue: 150000,
  realizedProfit: 77500,
  pendingExpenses: 18000,
  overdueExpenses: 6000,
  pendingRevenue: 25000,
  transactionCount: 1,
  incomeCount: 1,
  expenseCount: 0,
  areaHectares: 120.5,
  costPerHectare: 601.66,
  revenuePerHectare: 1244.81,
  profitPerHectare: 643.15,
};

const transaction: FinancialTransaction = {
  id: 5,
  description: 'Venda de soja',
  amount: 150000,
  type: 'INCOME',
  status: 'PAID',
  paymentMethod: 'PIX',
  transactionDate: '2026-06-30',
  dueDate: null,
  paidAt: '2026-06-30',
  notes: null,
  farmId: 10,
  farmName: 'Fazenda Boa Safra',
  categoryId: 3,
  categoryName: 'Venda',
  harvestSeasonId: 1,
  harvestSeasonName: 'Safra Soja 2026',
  createdByUserId: 1,
  createdByUserName: 'Ana Silva',
  updatedByUserId: null,
  updatedByUserName: null,
  recordStatus: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
};

const activities: ProductionActivity[] = [
  {
    id: 2,
    name: 'Soja',
    description: 'Cultivo de soja',
    status: 'ACTIVE',
  },
];

describe('HarvestSeasonDetailsPage', () => {
  let fixture: ComponentFixture<HarvestSeasonDetailsPage>;
  let harvestService: {
    getById: Mock;
    getSummary: Mock;
    update: Mock;
    updateStatus: Mock;
    inactivate: Mock;
  };
  let transactionService: { listByFarm: Mock };
  let productionActivityService: { listActive: Mock };
  let router: { navigate: Mock };
  let sessionStore: SessionStore;
  let farmAccessStore: FarmAccessStore;

  beforeEach(async () => {
    harvestService = {
      getById: vi.fn(() => of(harvest)),
      getSummary: vi.fn(() => of(summary)),
      update: vi.fn(() => of(harvest)),
      updateStatus: vi.fn(() => of(harvest)),
      inactivate: vi.fn(() => of(undefined)),
    };
    transactionService = {
      listByFarm: vi.fn(() => of(pageResponse([transaction]))),
    };
    productionActivityService = {
      listActive: vi.fn(() => of(activities)),
    };
    router = { navigate: vi.fn(() => Promise.resolve(true)) };

    await TestBed.configureTestingModule({
      imports: [HarvestSeasonDetailsPage],
      providers: [
        provideGestaoDiretaIcons(),
        ToastStore,
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } },
        },
        { provide: Router, useValue: router },
        { provide: HarvestSeasonService, useValue: harvestService },
        { provide: FinancialTransactionService, useValue: transactionService },
        { provide: ProductionActivityService, useValue: productionActivityService },
      ],
    }).compileComponents();

    sessionStore = TestBed.inject(SessionStore);
    farmAccessStore = TestBed.inject(FarmAccessStore);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.classList.remove('gd-overlay-open');
  });

  it('should read the route id and load harvest, summary and linked transactions', () => {
    setupUser('PRODUCER');
    createComponent();

    expect(harvestService.getById).toHaveBeenCalledWith(1);
    expect(harvestService.getSummary).toHaveBeenCalledWith(1);
    expect(transactionService.listByFarm).toHaveBeenCalledWith({
      farmId: 10,
      harvestSeasonId: 1,
      page: 0,
      size: 10,
      sort: 'transactionDate',
      direction: 'DESC',
    });
  });

  it('should render header, summary, hectare indicators, general information and transactions', () => {
    setupUser('PRODUCER');
    createComponent();

    expect(text()).toContain('Safra Soja 2026');
    expect(text()).toContain('Resumo financeiro');
    expect(text()).toContain('Custo realizado');
    expect(text()).toContain('Indicadores por hectare');
    expect(text()).toContain('Informações da safra');
    expect(text()).toContain('Venda de soja');
    expect(text()).toContain('Movimentações vinculadas');
  });

  it('should show an empty state when there are no linked transactions', () => {
    transactionService.listByFarm.mockReturnValue(of(pageResponse([])));
    setupUser('PRODUCER');
    createComponent();

    expect(text()).toContain('Nenhuma movimentação vinculada.');
  });

  it('should show not found message for 404 errors', () => {
    harvestService.getById.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    setupUser('PRODUCER');
    createComponent();

    expect(text()).toContain('Safra não encontrada.');
  });

  it('should navigate back to harvests when clicking Voltar', () => {
    setupUser('PRODUCER');
    createComponent();

    clickButton('Voltar');

    expect(router.navigate).toHaveBeenCalledWith(['/harvests']);
  });

  it('should show management actions only for users with permission', () => {
    setupUser('EMPLOYEE');
    createComponent();

    expect(text()).not.toContain('Editar');
    expect(text()).not.toContain('Inativar');

    TestBed.resetTestingModule();
  });

  it('should show management actions for producers', () => {
    setupUser('PRODUCER');
    createComponent();

    expect(text()).toContain('Editar');
    expect(text()).toContain('Inativar');
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(HarvestSeasonDetailsPage);
    fixture.detectChanges();
  }

  function setupUser(role: 'PRODUCER' | 'EMPLOYEE' | 'ACCOUNTANT'): void {
    sessionStore.setUser({
      id: 1,
      name: 'Ana Silva',
      email: 'ana@example.com',
      document: null,
      userType: 'USER',
      status: 'ACTIVE',
    });
    farmAccessStore.setAccess({
      farmId: 10,
      farmName: 'Fazenda Boa Safra',
      userId: 1,
      userType: 'USER',
      role,
      permissions: {
        canViewFarm: true,
        canEditFarm: role === 'PRODUCER',
        canChangeFarmStatus: false,
        canManageFarmUsers: role === 'PRODUCER',
        canViewFinancial: true,
        canManageTransactions: role === 'PRODUCER',
        canManageCategories: role === 'PRODUCER',
        canManageGlobalCategories: false,
        canCreateFarm: false,
      },
    });
  }

  function pageResponse(content: FinancialTransaction[]): PageResponse<FinancialTransaction> {
    return {
      content,
      page: 0,
      size: 10,
      totalElements: content.length,
      totalPages: content.length > 0 ? 1 : 0,
      first: true,
      last: true,
    };
  }

  function clickButton(label: string): void {
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (item) => item.textContent?.trim() === label,
    );

    button?.click();
    fixture.detectChanges();
  }

  function text(): string {
    fixture.detectChanges();
    return fixture.nativeElement.textContent ?? '';
  }
});
