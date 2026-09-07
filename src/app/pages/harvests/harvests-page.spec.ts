import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Mock, vi } from 'vitest';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { Farm } from '../../core/models/farm.models';
import {
  HarvestSeason,
  HarvestSeasonFinancialSummary,
  HarvestSeasonSummaryListItem,
  HarvestSeasonSummaryListParams,
} from '../../core/models/harvest-season.models';
import { PageResponse } from '../../core/models/page-response.model';
import { ProductionActivity } from '../../core/models/production-activity.models';
import { HarvestSeasonService } from '../../core/services/harvest-season.service';
import { ProductionActivityService } from '../../core/services/production-activity.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { HarvestsPage } from './harvests-page';

const farm: Farm = {
  id: 10,
  name: 'Fazenda Boa Safra',
  document: null,
  city: 'Londrina',
  state: 'PR',
  totalArea: 120,
  productionType: 'AGRICULTURE',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
};

const secondFarm: Farm = {
  id: 20,
  name: 'Fazenda Santa Clara',
  document: null,
  city: 'Maringa',
  state: 'PR',
  totalArea: 80,
  productionType: 'AGRICULTURE',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
};

const activities: ProductionActivity[] = [
  {
    id: 2,
    farmId: 10,
    farmName: 'Fazenda Boa Safra',
    name: 'Soja',
    description: 'Cultivo de soja',
    status: 'ACTIVE',
  },
  {
    id: 3,
    farmId: 10,
    farmName: 'Fazenda Boa Safra',
    name: 'Milho',
    description: 'Cultivo de milho',
    status: 'ACTIVE',
  },
];

const seasons: HarvestSeasonSummaryListItem[] = [
  {
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
    status: 'PLANNED',
    expectedProfit: 60000,
    realizedCost: 72500,
    realizedRevenue: 150000,
    realizedProfit: 77500,
    pendingExpenses: 18000,
    overdueExpenses: 6000,
    pendingRevenue: 25000,
    transactionCount: 6,
    incomeCount: 3,
    expenseCount: 3,
  },
  {
    id: 2,
    farmId: 10,
    farmName: 'Fazenda Boa Safra',
    productionActivityId: 2,
    productionActivityName: 'Soja',
    name: 'Safra Soja Inverno',
    description: null,
    startDate: '2026-07-01',
    endDate: '2026-11-30',
    expectedRevenue: 80000,
    expectedCost: 40000,
    areaHectares: 80,
    status: 'IN_PROGRESS',
    expectedProfit: 40000,
    realizedCost: 30000,
    realizedRevenue: 65000,
    realizedProfit: 35000,
    pendingExpenses: 5000,
    overdueExpenses: 1000,
    pendingRevenue: 7000,
    transactionCount: 4,
    incomeCount: 2,
    expenseCount: 2,
  },

  {
    id: 3,
    farmId: 10,
    farmName: 'Fazenda Boa Safra',
    productionActivityId: 2,
    productionActivityName: 'Soja',
    name: 'Safra Inativa',
    description: null,
    startDate: '2025-01-01',
    endDate: '2025-06-30',
    expectedRevenue: 40000,
    expectedCost: 10000,
    areaHectares: null,
    status: 'INACTIVE',
    expectedProfit: 30000,
    realizedCost: 12000,
    realizedRevenue: 8000,
    realizedProfit: -4000,
    pendingExpenses: 2000,
    overdueExpenses: 500,
    pendingRevenue: 0,
    transactionCount: 2,
    incomeCount: 1,
    expenseCount: 1,
  },
];

const response: PageResponse<HarvestSeasonSummaryListItem> = {
  content: seasons,
  page: 0,
  size: 10,
  totalElements: 3,
  totalPages: 1,
  first: true,
  last: true,
};

const financialSummary: HarvestSeasonFinancialSummary = {
  farmId: 10,
  activeHarvestCount: 2,
  planning: { plannedCost: 130000, plannedRevenue: 230000, plannedProfit: 100000, plannedMargin: 43.48 },
  realized: { realizedCost: 102500, realizedRevenue: 215000, realizedProfit: 112500, realizedMargin: 52.33 },
  projection: { projectedCost: 125500, projectedRevenue: 247000, projectedProfit: 121500, projectedMargin: 49.19 },
  comparison: { profitPerformancePercentage: 12.5, profitPerformanceStatus: 'ABOVE_PLANNED', costVarianceAmount: -27500, costVariancePercentage: -21.15, costVarianceStatus: 'BELOW_PLANNED' },
  openAmounts: {
    payableAmount: 23000,
    receivableAmount: 32000,
    pending: { payableAmount: 23000, receivableAmount: 32000 },
    overdue: { payableAmount: 0, receivableAmount: 0 },
  },
};

const emptyResponse: PageResponse<HarvestSeasonSummaryListItem> = {
  content: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
};

const activitiesResponse: PageResponse<ProductionActivity> = {
  content: activities,
  page: 0,
  size: 100,
  totalElements: activities.length,
  totalPages: 1,
  first: true,
  last: true,
};

describe('HarvestsPage', () => {
  let fixture: ComponentFixture<HarvestsPage>;
  let harvestService: {
    list: Mock;
    listSummary: Mock;
    getFinancialSummary: Mock;
    create: Mock;
    update: Mock;
    updateStatus: Mock;
    activate: Mock;
    inactivate: Mock;
  };
  let productionActivityService: { list: Mock };
  let selectedFarmStore: SelectedFarmStore;
  let farmAccessStore: FarmAccessStore;
  let sessionStore: SessionStore;

  beforeEach(async () => {
    harvestService = {
      list: vi.fn(() => of(response)),
      listSummary: vi.fn(() => of(response)),
      getFinancialSummary: vi.fn(() => of(financialSummary)),
      create: vi.fn(() => of(seasons[0] as HarvestSeason)),
      update: vi.fn(() => of(seasons[0] as HarvestSeason)),
      updateStatus: vi.fn(() => of({ ...(seasons[0] as HarvestSeason), status: 'IN_PROGRESS' })),
      activate: vi.fn(() => of({ ...(seasons[2] as HarvestSeason), status: 'PLANNED' })),
      inactivate: vi.fn(() => of(undefined)),
    };
    productionActivityService = {
      list: vi.fn(() => of(activitiesResponse)),
    };

    await TestBed.configureTestingModule({
      imports: [HarvestsPage],
      providers: [
        provideGestaoDiretaIcons(),
        provideRouter([]),
        { provide: HarvestSeasonService, useValue: harvestService },
        { provide: ProductionActivityService, useValue: productionActivityService },
      ],
    }).compileComponents();

    selectedFarmStore = TestBed.inject(SelectedFarmStore);
    farmAccessStore = TestBed.inject(FarmAccessStore);
    sessionStore = TestBed.inject(SessionStore);
    TestBed.inject(ToastStore);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.classList.remove('gd-overlay-open');
  });

  it('should not call the API without a selected farm', () => {
    sessionStore.setUser(user('USER'));
    fixture = TestBed.createComponent(HarvestsPage);
    fixture.detectChanges();

    expect(harvestService.listSummary).not.toHaveBeenCalled();
    expect(harvestService.list).not.toHaveBeenCalled();
    expect(productionActivityService.list).not.toHaveBeenCalled();
    expect(componentState().loading()).toBe(false);
    expect(text()).toContain('Selecione uma fazenda para visualizar as safras.');
  });

  it('should load harvest seasons and production activities for the selected farm', () => {
    setupSelectedFarm('PRODUCER');

    expect(harvestService.listSummary).toHaveBeenCalledWith({
      farmId: 10,
      search: '',
      statuses: [],
      productionActivityIds: [],
      periodStart: '',
      periodEnd: '',
      page: 0,
      size: 10,
      sort: 'startDate',
      direction: 'DESC',
    });
    expect(harvestService.list).not.toHaveBeenCalled();
    expect(productionActivityService.list).toHaveBeenCalledWith({
      farmId: 10,
      includeInactive: true,
      page: 0,
      size: 100,
      sort: 'name',
      direction: 'ASC',
    });
    expect(text()).toContain('Safras');
    expect(getListFilters().textContent).not.toContain('Nova safra');
    expect(text()).toContain('Safra Soja 2026');
    expect(text()).toContain('Safras ativas');
    expect(text()).toContain('130.000,00');
    expect(text()).toContain('112.500,00');
  });

  it('should finish loading after a successful PageResponse and avoid reloading in a loop', () => {
    setupSelectedFarm('PRODUCER');

    expect(componentState().loading()).toBe(false);
    expect(componentState().response()?.content).toEqual(seasons);

    fixture.detectChanges();

    expect(harvestService.listSummary).toHaveBeenCalledTimes(1);
  });

  it('should show an empty state when the selected farm has no harvest seasons', () => {
    harvestService.listSummary.mockReturnValueOnce(of(emptyResponse));

    setupSelectedFarm('PRODUCER');

    expect(componentState().loading()).toBe(false);
    expect(text()).toContain('Nenhuma safra cadastrada.');
  });

  it('should render financial summary data from the summary list response', () => {
    setupSelectedFarm('PRODUCER');

    const content = text();

    for (const label of [
      'Safras ativas',
      'Custo planejado',
      'Receita planejada',
      'Lucro planejado',
      'Custo realizado',
      'Receita realizada',
      'Lucro realizado',
      'Custo projetado',
      'Receita projetada',
      'Lucro projetado',
      'Desempenho do lucro',
      'Desvio de custo',
    ]) {
      expect(content).toContain(label);
    }
    const summaryCards = fixture.nativeElement.querySelectorAll(
      'section[aria-label="Resumo financeiro das safras"] gd-summary-card',
    ) as NodeListOf<HTMLElement>;

    expect(summaryCards).toHaveLength(12);
    for (const card of summaryCards) {
      expect(card.querySelectorAll('article > div:nth-child(2) > p')).toHaveLength(1);
    }

    const summaryHeadings = Array.from(
      fixture.nativeElement.querySelectorAll('section[aria-label="Resumo financeiro das safras"] h2') as NodeListOf<HTMLHeadingElement>,
    ).map((heading) => heading.textContent?.trim());

    expect(summaryHeadings).not.toContain('Visão geral');
    expect(summaryHeadings).not.toContain('Planejamento');
    expect(summaryHeadings).not.toContain('Realizado');
    expect(summaryHeadings).not.toContain('Projeção atual');
    expect(summaryHeadings).not.toContain('Comparação');
    expect(content).toContain('Resultado financeiro');
    expect(content).toContain('Pendencias e movimentacoes');
    expect(content).toContain('72.500,00');
    expect(content).toContain('150.000,00');
    expect(content).toContain('77.500,00');
    expect(content).toContain('18.000,00');
    expect(content).toContain('6.000,00');
    expect(content).toContain('6');
  });

  it('should keep comparison cards for not-applicable summary values', () => {
    harvestService.getFinancialSummary.mockReturnValueOnce(of({
      ...financialSummary,
      comparison: {
        profitPerformancePercentage: null,
        profitPerformanceStatus: 'NOT_APPLICABLE',
        costVarianceAmount: -27500,
        costVariancePercentage: null,
        costVarianceStatus: 'NOT_APPLICABLE',
      },
    }));

    setupSelectedFarm('PRODUCER');

    expect(text()).toContain('Desempenho do lucro');
    expect(text()).toContain('Desvio de custo');
    expect(text()).toContain('Não aplicável');
  });

  it('should show an error state and finish loading when the API fails', () => {
    harvestService.listSummary.mockReturnValueOnce(throwError(() => new Error('list failed')));

    setupSelectedFarm('PRODUCER');

    expect(componentState().loading()).toBe(false);
    expect(componentState().error()).toBe(true);
    expect(text()).toContain('Nao foi possivel carregar as safras');
  });

  it('should clear stale harvests and reload when the selected farm changes', () => {
    const secondFarmSeason: HarvestSeasonSummaryListItem = {
      ...seasons[0],
      id: 20,
      farmId: 20,
      farmName: 'Fazenda Santa Clara',
      name: 'Safra Milho Santa Clara',
    };

    harvestService.listSummary.mockImplementation((params: HarvestSeasonSummaryListParams) =>
      of(params.farmId === 20 ? { ...response, content: [secondFarmSeason], totalElements: 1 } : response),
    );

    setupSelectedFarm('PRODUCER');
    expect(text()).toContain('Safra Soja 2026');

    selectedFarmStore.setFarms([farm, secondFarm]);
    setFarmAccess(secondFarm, 'PRODUCER');
    selectedFarmStore.selectFarmById(20);
    fixture.detectChanges();

    expect(harvestService.listSummary).toHaveBeenLastCalledWith({
      farmId: 20,
      search: '',
      statuses: [],
      productionActivityIds: [],
      periodStart: '',
      periodEnd: '',
      page: 0,
      size: 10,
      sort: 'startDate',
      direction: 'DESC',
    });
    expect(componentState().loading()).toBe(false);
    expect(text()).toContain('Safra Milho Santa Clara');
    expect(text()).not.toContain('Safra Soja 2026');
  });

  it('should reload harvest summaries when filtering by multiple statuses', () => {
    setupSelectedFarm('PRODUCER');

    clickButton('Em andamento');
    clickButton('Planejadas');

    expect(harvestService.listSummary).toHaveBeenLastCalledWith({
      farmId: 10,
      search: '',
      statuses: ['IN_PROGRESS', 'PLANNED'],
      productionActivityIds: [],
      periodStart: '',
      periodEnd: '',
      page: 0,
      size: 10,
      sort: 'startDate',
      direction: 'DESC',
    });

    clickButton('Em andamento');

    expect(harvestService.listSummary).toHaveBeenLastCalledWith({
      farmId: 10,
      search: '',
      statuses: ['PLANNED'],
      productionActivityIds: [],
      periodStart: '',
      periodEnd: '',
      page: 0,
      size: 10,
      sort: 'startDate',
      direction: 'DESC',
    });

    clickButton('Todas');

    expect(harvestService.listSummary).toHaveBeenLastCalledWith({
      farmId: 10,
      search: '',
      statuses: [],
      productionActivityIds: [],
      periodStart: '',
      periodEnd: '',
      page: 0,
      size: 10,
      sort: 'startDate',
      direction: 'DESC',
    });
  });

  it('should reload harvest summaries when filtering by multiple production activities', () => {
    setupSelectedFarm('PRODUCER');

    clickButton('Soja');
    clickButton('Milho');

    expect(harvestService.listSummary).toHaveBeenLastCalledWith({
      farmId: 10,
      search: '',
      statuses: [],
      productionActivityIds: [2, 3],
      periodStart: '',
      periodEnd: '',
      page: 0,
      size: 10,
      sort: 'startDate',
      direction: 'DESC',
    });
  });

  it('should reload harvest summaries when searching', () => {
    setupSelectedFarm('PRODUCER');

    setFilterInput('#filter-search', 'soja');
    clickFilterButton('Aplicar filtros');

    expect(harvestService.listSummary).toHaveBeenLastCalledWith({
      farmId: 10,
      search: 'soja',
      statuses: [],
      productionActivityIds: [],
      periodStart: '',
      periodEnd: '',
      page: 0,
      size: 10,
      sort: 'startDate',
      direction: 'DESC',
    });
  });

  it('should send search, status, activity and period together', () => {
    setupSelectedFarm('PRODUCER');

    setFilterInput('#filter-search', 'soja');
    setFilterInput('#filter-periodStart', '2026-01-01');
    setFilterInput('#filter-periodEnd', '2026-12-31');
    clickButton('Em andamento');
    clickButton('Soja');
    clickFilterButton('Aplicar filtros');

    expect(harvestService.listSummary).toHaveBeenLastCalledWith({
      farmId: 10,
      search: 'soja',
      statuses: ['IN_PROGRESS'],
      productionActivityIds: [2],
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
      page: 0,
      size: 10,
      sort: 'startDate',
      direction: 'DESC',
    });
  });

  it('should show period error and avoid loading when the period is invalid', () => {
    setupSelectedFarm('PRODUCER');
    const initialCalls = harvestService.listSummary.mock.calls.length;

    setFilterInput('#filter-periodStart', '2026-12-31');
    setFilterInput('#filter-periodEnd', '2026-01-01');
    clickFilterButton('Aplicar filtros');

    expect(harvestService.listSummary).toHaveBeenCalledTimes(initialCalls);
    expect(text()).toContain('A data inicial não pode ser posterior à data final.');
    expect(text()).toContain('Safra Soja 2026');
  });

  it('should clear all filters', () => {
    setupSelectedFarm('PRODUCER');

    setFilterInput('#filter-search', 'soja');
    setFilterInput('#filter-periodStart', '2026-01-01');
    setFilterInput('#filter-periodEnd', '2026-12-31');
    clickButton('Em andamento');
    clickButton('Soja');
    clickFilterButton('Limpar filtros');

    expect(harvestService.listSummary).toHaveBeenLastCalledWith({
      farmId: 10,
      search: '',
      statuses: [],
      productionActivityIds: [],
      periodStart: '',
      periodEnd: '',
      page: 0,
      size: 10,
      sort: 'startDate',
      direction: 'DESC',
    });
  });

  it('should keep filters when paginating', () => {
    harvestService.listSummary.mockReturnValue(of({ ...response, page: 0, totalPages: 2, first: true, last: false }));
    setupSelectedFarm('PRODUCER');

    clickButton('Em andamento');
    clickButton('Proxima');

    expect(harvestService.listSummary).toHaveBeenLastCalledWith({
      farmId: 10,
      search: '',
      statuses: ['IN_PROGRESS'],
      productionActivityIds: [],
      periodStart: '',
      periodEnd: '',
      page: 1,
      size: 10,
      sort: 'startDate',
      direction: 'DESC',
    });
  });

  it('should keep harvest list working when production activities fail to load', () => {
    const toastStore = TestBed.inject(ToastStore);
    const errorSpy = vi.spyOn(toastStore, 'error');
    productionActivityService.list.mockReturnValueOnce(throwError(() => new Error('activities failed')));

    setupSelectedFarm('PRODUCER');

    expect(harvestService.listSummary).toHaveBeenCalled();
    expect(text()).toContain('Safra Soja 2026');
    expect(text()).toContain('Nenhuma atividade produtiva disponivel.');
    expect(errorSpy).toHaveBeenCalledWith('Não foi possível carregar as atividades produtivas.');
  });

  it('should render clickable harvest cards without inline actions', () => {
    setupSelectedFarm('PRODUCER');

    const cards = harvestCards();

    expect(cards).toHaveLength(3);
    expect(cards[0].getAttribute('role')).toBe('button');
    expect(cards[0].getAttribute('tabindex')).toBe('0');
    expect(cards[0].getAttribute('aria-label')).toBe('Abrir detalhes da safra Safra Soja 2026');
    expect(cards[0].getAttribute('title')).toBe('Clique para ver detalhes da safra');
    expect(text()).not.toContain('Ver detalhes');
    expect(text()).not.toContain('Editar');
    expect(text()).not.toContain('Inativar');
    expect(text()).not.toContain('Ativar');
  });

  it('should navigate to details when clicking a harvest card', () => {
    setupSelectedFarm('PRODUCER');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    harvestCards()[0].click();
    fixture.detectChanges();

    expect(navigate).toHaveBeenCalledWith(['/harvests', 1]);
  });

  it('should navigate to details with Enter and Space on a harvest card', () => {
    setupSelectedFarm('PRODUCER');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const card = harvestCards()[1];
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ', cancelable: true });

    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    card.dispatchEvent(spaceEvent);
    fixture.detectChanges();

    expect(navigate).toHaveBeenNthCalledWith(1, ['/harvests', 2]);
    expect(navigate).toHaveBeenNthCalledWith(2, ['/harvests', 2]);
    expect(spaceEvent.defaultPrevented).toBe(true);
  });

  it('should hide management actions for employees', () => {
    setupSelectedFarm('EMPLOYEE');

    expect(text()).not.toContain('Nova safra');
    expect(text()).not.toContain('Ver detalhes');
    expect(text()).not.toContain('Editar');
    expect(text()).not.toContain('Inativar');
    expect(text()).not.toContain('Ativar');
  });

  it('should create a harvest season from the drawer form', () => {
    setupSelectedFarm('PRODUCER');
    const component = fixture.componentInstance as unknown as HarvestsPage & {
      openCreateDrawer(): void;
      form: any;
      saveHarvest(): void;
    };

    component.openCreateDrawer();
    component.form.setValue({
      productionActivityId: 2,
      name: 'Safra Nova',
      description: 'Nova safra de soja',
      startDate: '2026-02-01',
      endDate: '2026-08-01',
      areaHectares: 30,
    });
    const initialCalls = harvestService.listSummary.mock.calls.length;
    component.saveHarvest();
    fixture.detectChanges();

    expect(harvestService.create).toHaveBeenCalledWith({
      farmId: 10,
      productionActivityId: 2,
      name: 'Safra Nova',
      description: 'Nova safra de soja',
      startDate: '2026-02-01',
      endDate: '2026-08-01',
      areaHectares: 30,
    });
    expect(harvestService.update).not.toHaveBeenCalled();
    expect(harvestService.activate).not.toHaveBeenCalled();
    expect(harvestService.inactivate).not.toHaveBeenCalled();
    expect(harvestService.listSummary).toHaveBeenCalledTimes(initialCalls + 1);
  });

  it('should show the planned initial status as information instead of an editable field', () => {
    setupSelectedFarm('PRODUCER');
    clickButton('Nova safra');

    expect(fixture.nativeElement.querySelector('#harvest-status')).toBeNull();
    expect(text()).toContain('Status inicial: Planejada');
  });

  it('should allow a description with up to 500 characters', () => {
    setupSelectedFarm('PRODUCER');
    const component = fixture.componentInstance as unknown as HarvestsPage & { form: any };

    component.form.controls.description.setValue('a'.repeat(500));
    expect(component.form.controls.description.valid).toBe(true);

    component.form.controls.description.setValue('a'.repeat(501));
    expect(component.form.controls.description.valid).toBe(false);
  });


  function setupSelectedFarm(role: 'PRODUCER' | 'EMPLOYEE' | 'ACCOUNTANT'): void {
    sessionStore.setUser(user('USER'));
    selectedFarmStore.setFarms([farm]);
    setFarmAccess(farm, role);

    fixture = TestBed.createComponent(HarvestsPage);
    fixture.detectChanges();
  }

  function setFarmAccess(item: Farm, role: 'PRODUCER' | 'EMPLOYEE' | 'ACCOUNTANT'): void {
    farmAccessStore.setAccess({
      farmId: item.id,
      farmName: item.name,
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

  function user(userType: 'ADMIN' | 'USER') {
    return {
      id: 1,
      name: 'Ana Silva',
      email: 'ana@example.com',
      document: null,
      userType,
      status: 'ACTIVE',
    };
  }

  function componentState(): {
    loading: () => boolean;
    error: () => boolean;
    response: () => PageResponse<HarvestSeasonSummaryListItem> | null;
  } {
    return fixture.componentInstance as unknown as {
      loading: () => boolean;
      error: () => boolean;
      response: () => PageResponse<HarvestSeasonSummaryListItem> | null;
    };
  }


  function getListFilters(): HTMLElement {
    return fixture.nativeElement.querySelector('gd-list-filters') as HTMLElement;
  }

  function setFilterInput(selector: string, value: string): void {
    const input = getListFilters().querySelector<HTMLInputElement>(selector) as HTMLInputElement;

    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function clickFilterButton(label: string): void {
    const button = Array.from(getListFilters().querySelectorAll('button')).find(
      (item) => item.getAttribute('aria-label') === label || item.getAttribute('title') === label,
    );

    button?.click();
    fixture.detectChanges();
  }

  function clickButton(label: string): void {
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (item) => item.textContent?.trim() === label,
    );

    button?.click();
    fixture.detectChanges();
  }

  function harvestCards(): HTMLElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('article[role="button"]'));
  }

  function text(): string {
    fixture.detectChanges();
    return fixture.nativeElement.textContent ?? '';
  }
});
