import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { AuthUser } from '../../core/models/auth.models';
import { FarmAccessResponse } from '../../core/models/farm-access.models';
import { Farm } from '../../core/models/farm.models';
import { FinancialAgendaItem, FinancialAgendaSummary } from '../../core/models/financial-agenda.models';
import { HarvestSeason } from '../../core/models/harvest-season.models';
import { PageResponse } from '../../core/models/page-response.model';
import { FinancialAgendaService } from '../../core/services/financial-agenda.service';
import { HarvestSeasonService } from '../../core/services/harvest-season.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';

import { UpcomingBillsPage } from './upcoming-bills-page';

const admin: AuthUser = {
  id: 1,
  name: 'Admin',
  email: 'admin@example.com',
  document: null,
  userType: 'ADMIN',
  status: 'ACTIVE',
};

const user: AuthUser = {
  ...admin,
  id: 2,
  name: 'Contador',
  email: 'contador@example.com',
  userType: 'USER',
};

const farm: Farm = {
  id: 1,
  name: 'Fazenda Boa Safra',
  document: null,
  city: 'Ribeirão Preto',
  state: 'SP',
  totalArea: 120,
  productionType: 'AGRICULTURE',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-10T00:00:00Z',
};

const secondFarm: Farm = {
  ...farm,
  id: 2,
  name: 'Fazenda Santa Clara',
};

const access: FarmAccessResponse = {
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  userId: 2,
  userType: 'USER',
  role: 'EMPLOYEE',
  permissions: {
    canViewFarm: true,
    canEditFarm: false,
    canChangeFarmStatus: false,
    canManageFarmUsers: false,
    canViewFinancial: true,
    canManageTransactions: false,
    canManageCategories: false,
    canManageGlobalCategories: false,
    canCreateFarm: false,
  },
};

const summary: FinancialAgendaSummary = {
  farmId: 1,
  overdueReceivable: { count: 2, totalAmount: 1200 },
  overduePayable: { count: 3, totalAmount: 4200 },
  pendingReceivable: { count: 4, totalAmount: 5000 },
  pendingPayable: { count: 5, totalAmount: 2300 },
  openReceivable: { count: 6, totalAmount: 6200 },
  openPayable: { count: 8, totalAmount: 6500 },
};

const receivableItem: FinancialAgendaItem = {
  id: 1,
  farmId: 1,
  description: 'Venda de milho',
  agendaType: 'RECEIVABLE',
  transactionType: 'INCOME',
  agendaStatus: 'PENDING',
  paymentStatus: 'PENDING',
  amount: 3000,
  dueDate: '2026-07-10',
  daysOverdue: null,
  daysUntilDue: 3,
  categoryId: 1,
  categoryName: 'Venda de safra',
  harvestSeasonId: 10,
  harvestSeasonName: 'Milho',
};

const payableItem: FinancialAgendaItem = {
  ...receivableItem,
  id: 2,
  description: 'Compra de sementes',
  agendaType: 'PAYABLE',
  transactionType: 'EXPENSE',
  agendaStatus: 'OVERDUE',
  amount: 900,
  dueDate: '2026-07-01',
  daysOverdue: 6,
  daysUntilDue: null,
  categoryName: 'Insumos',
  harvestSeasonId: null,
  harvestSeasonName: null,
};

const harvestSeasons: HarvestSeason[] = [
  harvestSeason(10, 'Milho'),
  harvestSeason(20, 'Feijão'),
];

describe('UpcomingBillsPage as Financial Agenda', () => {
  let fixture: ComponentFixture<UpcomingBillsPage>;
  let agendaService: {
    getSummary: ReturnType<typeof vi.fn>;
    getItems: ReturnType<typeof vi.fn>;
  };
  let harvestSeasonService: { list: ReturnType<typeof vi.fn> };
  let selectedFarmStore: SelectedFarmStore;
  let farmAccessStore: FarmAccessStore;
  let sessionStore: SessionStore;

  beforeEach(async () => {
    agendaService = {
      getSummary: vi.fn().mockReturnValue(of(summary)),
      getItems: vi.fn().mockReturnValue(of(pageResponse([receivableItem, payableItem]))),
    };
    harvestSeasonService = {
      list: vi.fn().mockReturnValue(of(pageResponse(harvestSeasons))),
    };

    await TestBed.configureTestingModule({
      imports: [UpcomingBillsPage],
      providers: [
        provideGestaoDiretaIcons(),
        { provide: FinancialAgendaService, useValue: agendaService },
        { provide: HarvestSeasonService, useValue: harvestSeasonService },
      ],
    }).compileComponents();

    selectedFarmStore = TestBed.inject(SelectedFarmStore);
    farmAccessStore = TestBed.inject(FarmAccessStore);
    sessionStore = TestBed.inject(SessionStore);
    selectedFarmStore.clear();
    farmAccessStore.clear();
    sessionStore.clear();
    sessionStore.setUser(admin);
  });

  afterEach(() => {
    selectedFarmStore.clear();
    farmAccessStore.clear();
    sessionStore.clear();
  });

  it('should render title, empty state and avoid endpoints without selected farm', () => {
    createPage();

    expect(text()).toContain('Agenda Financeira');
    expect(text()).toContain('Selecione uma fazenda para visualizar a agenda financeira.');
    expect(agendaService.getSummary).not.toHaveBeenCalled();
    expect(agendaService.getItems).not.toHaveBeenCalled();
    expect(harvestSeasonService.list).not.toHaveBeenCalled();
  });

  it('should show access denied and avoid agenda endpoints without permission', () => {
    sessionStore.setUser(user);
    selectedFarmStore.setFarms([farm]);
    farmAccessStore.setAccess({
      ...access,
      permissions: { ...access.permissions, canViewFinancial: false },
    });
    createPage();

    expect(text()).toContain('Acesso restrito');
    expect(text()).toContain('Você não tem permissão para visualizar a agenda financeira.');
    expect(agendaService.getSummary).not.toHaveBeenCalled();
    expect(agendaService.getItems).not.toHaveBeenCalled();
  });

  it('should load summary, items and harvest seasons with selected farm', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    expect(harvestSeasonService.list).toHaveBeenCalledWith({
      farmId: 1,
      includeInactive: true,
      page: 0,
      size: 100,
      sort: 'startDate',
      direction: 'DESC',
    });
    expect(agendaService.getSummary).toHaveBeenCalledWith({
      farmId: 1,
      status: 'ALL',
      type: 'ALL',
      periodDays: 30,
      harvestSeasonIds: [],
    });
    expect(agendaService.getItems).toHaveBeenCalledWith({
      farmId: 1,
      status: 'ALL',
      type: 'ALL',
      periodDays: 30,
      harvestSeasonIds: [],
      page: 0,
      size: 10,
    });
  });

  it('should render the six agenda summary cards from summary response', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    expect(fixture.nativeElement.querySelectorAll('gd-summary-card').length).toBe(6);
    expect(text()).toContain('Vencidas a receber');
    expect(text()).toContain('2 contas');
    expect(text()).toContain('Vencidas a pagar');
    expect(text()).toContain('3 contas');
    expect(text()).toContain('Pendentes a receber');
    expect(text()).toContain('4 contas');
    expect(text()).toContain('Pendentes a pagar');
    expect(text()).toContain('5 contas');
    expect(text()).toContain('Total a receber');
    expect(text()).toContain('6 contas');
    expect(text()).toContain('Total a pagar');
    expect(text()).toContain('8 contas');
  });

  it('should render agenda list fields', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    expect(text()).toContain('Contas da agenda');
    expect(text()).toContain('Venda de milho');
    expect(text()).toContain('Compra de sementes');
    expect(text()).toContain('A receber');
    expect(text()).toContain('A pagar');
    expect(text()).toContain('Pendente');
    expect(text()).toContain('Vencido');
    expect(text()).toContain('Venda de safra');
    expect(text()).toContain('Insumos');
    expect(text()).toContain('Milho');
    expect(text()).toContain('Sem safra');
    expect(text()).toContain('Vence em 3 dias');
    expect(text()).toContain('Vencido há 6 dias');
  });

  it('should change status, type and period filters and reset page', () => {
    agendaService.getItems.mockReturnValue(of(pageResponse([receivableItem], 0, 2)));
    selectedFarmStore.setFarms([farm]);
    createPage();

    clickButton('Próxima');
    expect(lastItemsCall()).toEqual(expect.objectContaining({ page: 1 }));

    clickFilter('Filtro de status', 'Pendentes');
    expect(lastItemsCall()).toEqual(expect.objectContaining({ status: 'PENDING', page: 0 }));

    clickButton('Próxima');
    clickFilter('Filtro de tipo', 'A receber');
    expect(lastItemsCall()).toEqual(expect.objectContaining({ type: 'RECEIVABLE', page: 0 }));

    clickButton('Próxima');
    clickFilter('Filtro de período', '7 dias');
    expect(lastItemsCall()).toEqual(expect.objectContaining({ periodDays: 7, page: 0 }));
  });

  it('should allow multiple harvest seasons and clear with Todas', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    clickFilter('Filtro de safra', 'Milho · Soja');
    clickFilter('Filtro de safra', 'Feijão · Soja');
    expect(lastItemsCall()).toEqual(expect.objectContaining({ harvestSeasonIds: [10, 20] }));

    clickFilter('Filtro de safra', 'Todas');
    expect(lastItemsCall()).toEqual(expect.objectContaining({ harvestSeasonIds: [] }));
  });

  it('should reset harvest filters and reload data when selected farm changes', () => {
    selectedFarmStore.setFarms([farm, secondFarm]);
    createPage();

    clickFilter('Filtro de safra', 'Milho · Soja');
    expect(lastItemsCall()).toEqual(expect.objectContaining({ farmId: 1, harvestSeasonIds: [10] }));

    selectedFarmStore.selectFarmById(2);
    fixture.detectChanges();

    expect(harvestSeasonService.list).toHaveBeenCalledWith(expect.objectContaining({ farmId: 2 }));
    expect(lastItemsCall()).toEqual(expect.objectContaining({ farmId: 2, harvestSeasonIds: [], page: 0 }));
  });

  it('should paginate with the next page', () => {
    agendaService.getItems.mockReturnValue(of(pageResponse([receivableItem], 0, 2)));
    selectedFarmStore.setFarms([farm]);
    createPage();

    clickButton('Próxima');

    expect(lastItemsCall()).toEqual(expect.objectContaining({ page: 1 }));
  });

  it('should render empty and error states', () => {
    agendaService.getItems.mockReturnValueOnce(of(pageResponse([])));
    selectedFarmStore.setFarms([farm]);
    createPage();
    expect(text()).toContain('Nenhuma conta encontrada');
    expect(text()).toContain('Não há contas em aberto para os filtros selecionados.');

    agendaService.getSummary.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    createPage();
    expect(text()).toContain('Não foi possível carregar a agenda financeira.');
  });

  function createPage(): void {
    fixture = TestBed.createComponent(UpcomingBillsPage);
    fixture.detectChanges();
  }

  function text(): string {
    return fixture.nativeElement.textContent as string;
  }

  function lastItemsCall(): unknown {
    return agendaService.getItems.mock.calls.at(-1)?.[0];
  }

  function clickButton(label: string): void {
    findButton(fixture.nativeElement, label)?.click();
    fixture.detectChanges();
  }

  function clickFilter(groupLabel: string, label: string): void {
    const group = fixture.nativeElement.querySelector(`[aria-label="${groupLabel}"]`) as HTMLElement;
    findButton(group, label)?.click();
    fixture.detectChanges();
  }
});

function pageResponse<T>(content: T[], page = 0, totalPages = content.length > 0 ? 1 : 0): PageResponse<T> {
  return {
    content,
    page,
    size: 10,
    totalElements: content.length,
    totalPages,
    first: page === 0,
    last: page + 1 >= totalPages,
  };
}

function harvestSeason(id: number, name: string): HarvestSeason {
  return {
    id,
    farmId: 1,
    productionActivityId: 1,
    productionActivityName: 'Soja',
    name,
    description: null,
    startDate: '2026-01-01',
    endDate: null,
    expectedRevenue: null,
    expectedCost: null,
    areaHectares: null,
    status: 'IN_PROGRESS',
  };
}

function findButton(root: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  ) as HTMLButtonElement | undefined;
}
