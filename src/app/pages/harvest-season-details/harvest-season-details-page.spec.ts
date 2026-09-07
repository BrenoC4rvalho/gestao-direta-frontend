import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { Mock, vi } from 'vitest';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { Farm } from '../../core/models/farm.models';
import { FinancialTransaction } from '../../core/models/financial-transaction.models';
import {
  HarvestSeason,
  HarvestSeasonBudget,
  HarvestSeasonDetailSummary,
} from '../../core/models/harvest-season.models';
import { PageResponse } from '../../core/models/page-response.model';
import { ProductionActivity } from '../../core/models/production-activity.models';
import { FinancialTransactionService } from '../../core/services/financial-transaction.service';
import { FinancialCategoryService } from '../../core/services/financial-category.service';
import {
  HarvestSeasonService,
  InvalidHarvestSeasonDetailSummaryError,
} from '../../core/services/harvest-season.service';
import { ProductionActivityService } from '../../core/services/production-activity.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { PageHeaderStore } from '../../core/stores/page-header.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
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
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-02-01T00:00:00',
};

const farm: Farm = {
  id: 10,
  name: 'Fazenda Boa Safra',
  document: null,
  city: 'Londrina',
  state: 'PR',
  totalArea: 120.5,
  productionType: 'AGRICULTURE',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
};

const secondFarm: Farm = {
  ...farm,
  id: 20,
  name: 'Fazenda Santa Clara',
};

const summary: HarvestSeasonDetailSummary = {
  harvestSeasonId: 25,
  harvestSeasonName: 'Café 2026/2027',
  productionActivityId: 25,
  productionActivityName: 'Café',
  farmId: 8,
  farmName: 'Fazenda Boa Sorte',
  areaHectares: 48,
  planning: { plannedCost: 128000, plannedRevenue: 195000, plannedProfit: 67000, plannedMargin: 34.36 },
  realized: { realizedCost: 0, realizedRevenue: 0, realizedProfit: 0, realizedMargin: 0 },
  projection: { projectedCost: 29200, projectedRevenue: 58000, projectedProfit: 28800, projectedMargin: 49.66 },
  comparison: {
    profitPerformanceAmount: -38200,
    profitPerformancePercentage: -57.01,
    profitPerformanceStatus: 'BELOW_PLANNED',
    costVarianceAmount: -98800,
    costVariancePercentage: -77.19,
    costVarianceStatus: 'BELOW_PLANNED',
  },
  openAmounts: {
    payableAmount: 29200,
    receivableAmount: 58000,
    pending: { payableAmount: 29200, receivableAmount: 58000 },
    overdue: { payableAmount: 0, receivableAmount: 0 },
  },
  plannedCostPerHectare: 2666.67,
  plannedRevenuePerHectare: 4062.5,
  plannedResultPerHectare: 1395.83,
  projectedCostPerHectare: 608.33,
  projectedRevenuePerHectare: 1208.33,
  projectedProfitPerHectare: 600,
  realizedCostPerHectare: 0,
  realizedRevenuePerHectare: 0,
  realizedProfitPerHectare: 0,
  transactionCount: 3,
  incomeCount: 1,
  expenseCount: 2,
};

const budget: HarvestSeasonBudget = {
  harvestSeasonId: 1,
  plannedRevenue: 0,
  plannedExpense: 0,
  plannedResult: 0,
  plannedMargin: 0,
  expenses: [],
  incomes: [],
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
    farmId: 10,
    farmName: 'Fazenda Boa Safra',
    name: 'Soja',
    description: 'Cultivo de soja',
    status: 'ACTIVE',
  },
];

const activitiesResponse: PageResponse<ProductionActivity> = {
  content: activities,
  page: 0,
  size: 100,
  totalElements: activities.length,
  totalPages: 1,
  first: true,
  last: true,
};

describe('HarvestSeasonDetailsPage', () => {
  let fixture: ComponentFixture<HarvestSeasonDetailsPage>;
  let harvestService: {
    getById: Mock;
    getSummary: Mock;
    getBudgetItems: Mock;
    createBudgetItem: Mock;
    updateBudgetItem: Mock;
    deleteBudgetItem: Mock;
    update: Mock;
    updateStatus: Mock;
    activate: Mock;
    inactivate: Mock;
  };
  let transactionService: { listByFarm: Mock };
  let productionActivityService: { list: Mock };
  let categoryService: { listByFarm: Mock };
  let router: { navigate: Mock };
  let sessionStore: SessionStore;
  let farmAccessStore: FarmAccessStore;
  let pageHeaderStore: PageHeaderStore;
  let selectedFarmStore: SelectedFarmStore;

  beforeEach(async () => {
    harvestService = {
      getById: vi.fn(() => of(harvest)),
      getSummary: vi.fn(() => of(summary)),
      getBudgetItems: vi.fn(() => of(budget)),
      createBudgetItem: vi.fn(() => of({})),
      updateBudgetItem: vi.fn(() => of({})),
      deleteBudgetItem: vi.fn(() => of(undefined)),
      update: vi.fn(() => of(harvest)),
      updateStatus: vi.fn(() => of(harvest)),
      activate: vi.fn(() => of({ ...harvest, status: 'PLANNED' })),
      inactivate: vi.fn(() => of(undefined)),
    };
    transactionService = {
      listByFarm: vi.fn(() => of(pageResponse([transaction]))),
    };
    productionActivityService = {
      list: vi.fn(() => of(activitiesResponse)),
    };
    categoryService = { listByFarm: vi.fn(() => of([])) };
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
        { provide: FinancialCategoryService, useValue: categoryService },
      ],
    }).compileComponents();

    sessionStore = TestBed.inject(SessionStore);
    farmAccessStore = TestBed.inject(FarmAccessStore);
    pageHeaderStore = TestBed.inject(PageHeaderStore);
    selectedFarmStore = TestBed.inject(SelectedFarmStore);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.classList.remove('gd-overlay-open');
    pageHeaderStore.hideHarvestHeader();
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

  it('should return to the harvest list when the selected farm changes', () => {
    selectedFarmStore.setFarms([farm, secondFarm]);
    setupUser('PRODUCER');
    createComponent();

    selectedFarmStore.selectFarmById(secondFarm.id);
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/harvests']);
  });

  it('should render the overview as the initial tab without planning content', () => {
    setupUser('PRODUCER');
    createComponent();

    expect(summaryCardTitles()).toEqual([
      'Custo projetado',
      'Receita projetada',
      'Lucro projetado',
      'Desvio de custo',
    ]);
    expect(text()).toContain('29.200,00');
    expect(text()).not.toContain('Custo planejado');
    expect(text()).not.toContain('Indicadores por hectare');

    clickButton('Ver todos os indicadores');

    expect(text()).toContain('98.800,00');
    expect(sectionHeadingTexts()).toContain('Movimentações vinculadas · 3');
    expect(text()).toContain('Indicadores por hectare');
    expect(text()).toContain('Lucro projetado');
    expect(text()).not.toContain('Lucro previsto');
    expect(text()).toContain('Venda de soja');
    expect(text()).not.toContain('Organize as receitas e despesas previstas para esta Safra.');
    expect(text()).toContain('Informações da safra');
    expect(text()).toContain('Movimentações vinculadas');
  });

  it('should render the compact harvest information summary', () => {
    setupUser('PRODUCER');
    createComponent();

    const informationSection = (fixture.nativeElement as HTMLElement).querySelector(
      'section[aria-labelledby="harvest-info-heading"]',
    );
    const informationText = informationSection?.textContent ?? '';

    expect(informationText).toContain('Nome');
    expect(informationText).toContain('Safra Soja 2026');
    expect(informationText).toContain('Atividade produtiva');
    expect(informationText).toContain('Soja');
    expect(informationText).toContain('Fazenda');
    expect(informationText).toContain('Fazenda Boa Safra');
    expect(informationText).toContain('Status');
    expect(informationSection?.querySelector('gd-badge')?.textContent).toContain('Em andamento');
    expect(informationText).toContain('Período');
    expect(informationText).toContain('01/01/2026 a 30/06/2026');
    expect(informationText).toContain('Área');
    expect(informationText).toContain('120.5 ha');
    expect(informationText).toContain('Descrição');
    expect(informationText).toContain('Safra de verao');
    expect(informationText).toContain('Criado em');
    expect(informationText).toContain('01/01/2026');
    expect(informationText).toContain('Atualizado em');
    expect(informationText).toContain('01/02/2026');
  });

  it('should publish the harvest name, status and metadata to the page header', () => {
    setupUser('PRODUCER');
    createComponent();

    expect(pageHeaderStore.harvestHeader()).toEqual({
      state: 'ready',
      header: {
        title: 'Safra Soja 2026',
        statusLabel: 'Em andamento',
        statusVariant: 'success',
        metadata: 'Fazenda Boa Safra • Soja • 01/01/2026 a 30/06/2026 • 120.5 ha',
      },
    });
  });

  it('should keep the page header in a loading state until the harvest is available', () => {
    harvestService.getById.mockReturnValue(new Subject<HarvestSeason>());
    setupUser('PRODUCER');
    createComponent();

    expect(pageHeaderStore.harvestHeader()).toEqual({ state: 'loading' });
  });

  it('should render transaction type in the desktop table', () => {
    setupUser('PRODUCER');
    createComponent();

    expect(tableHeaderTexts()).toEqual([
      'Data',
      'Descrição',
      'Categoria',
      'Status',
      'Valor',
    ]);
    expect(text()).toContain('Receita');
  });

  it('should show an empty state when there are no linked transactions', () => {
    transactionService.listByFarm.mockReturnValue(of(pageResponse([])));
    setupUser('PRODUCER');
    createComponent();

    expect(text()).toContain('Nenhuma movimentação vinculada a esta safra.');
  });

  it('should return no summary cards while the summary is null', () => {
    setupUser('PRODUCER');
    createComponent();

    const component = fixture.componentInstance as unknown as HarvestSeasonDetailsPage & {
      summary: { set(value: HarvestSeasonDetailSummary | null): void };
      summaryCards(): readonly unknown[];
    };
    component.summary.set(null);

    expect(component.summaryCards()).toEqual([]);
  });

  it.each([
    ['PLANNED', ['Custo planejado', 'Receita planejada', 'Lucro planejado', 'Margem planejada']],
    ['IN_PROGRESS', ['Custo projetado', 'Receita projetada', 'Lucro projetado', 'Desvio de custo']],
    ['FINISHED', ['Custo realizado', 'Receita realizada', 'Lucro realizado', 'Margem realizada']],
    ['INACTIVE', ['Custo realizado', 'Receita realizada', 'Lucro realizado', 'Margem realizada']],
  ] as const)('should select the correct primary cards for %s harvests', (status, titles) => {
    setupUser('PRODUCER');
    createComponent();

    const component = fixture.componentInstance as unknown as HarvestSeasonDetailsPage & {
      harvest: { set(value: HarvestSeason | null): void };
      mainSummaryCards(): readonly { title: string; description: string }[];
    };
    component.harvest.set({ ...harvest, status });

    expect(component.mainSummaryCards().map((card) => card.title)).toEqual(titles);
  });

  it('should explain projection and cost variance using open commitments and the budget', () => {
    setupUser('PRODUCER');
    createComponent();

    const component = fixture.componentInstance as unknown as HarvestSeasonDetailsPage & {
      summaryCards(): readonly { title: string; description: string }[];
    };
    const cards = component.summaryCards();

    expect(cards.find((card) => card.title === 'Lucro projetado')?.description).toContain(
      'realizado e compromissos em aberto',
    );
    expect(cards.find((card) => card.title === 'Desvio de custo')?.description).toContain(
      'orçamento da safra',
    );
  });

  it('should keep harvest details and transactions available when the summary fails without a fallback count', () => {
    harvestService.getSummary.mockReturnValue(throwError(() => new Error('summary')));
    setupUser('PRODUCER');
    createComponent();

    expect(text()).toContain('Safra Soja 2026');
    expect(text()).toContain('Venda de soja');
    expect(sectionHeadingTexts()).toContain('Movimentações vinculadas');
    expect(text()).not.toContain('Movimentações vinculadas · 1');
  });

  it('should render pending and overdue amounts without counts', () => {
    setupUser('PRODUCER');
    createComponent();
    clickButton('Ver todos os indicadores');

    const cards = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('gd-summary-card'),
    );
    const cardText = (title: string) =>
      cards.find((card) => card.textContent?.includes(title))?.textContent ?? '';

    expect(cardText('A pagar')).toContain('29.200,00');
    expect(cardText('A receber')).toContain('58.000,00');
    expect(cardText('Vencidas a pagar')).toContain('0,00');
    expect(cardText('Vencidas a receber')).toContain('0,00');
    expect(cardText('A pagar')).not.toContain('2 contas');
  });

  it('should use a positive tone for cost below planned', () => {
    setupUser('PRODUCER');
    createComponent();
    clickButton('Ver todos os indicadores');

    const card = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('gd-summary-card'),
    ).find((item) => item.textContent?.includes('Desvio de custo'));

    expect(
      Array.from(card?.querySelectorAll('div') ?? []).some((item) =>
        item.classList.contains('bg-success/10'),
      ),
    ).toBe(true);
  });

  it('should open the detailed indicators drawer with every summary group', () => {
    setupUser('PRODUCER');
    createComponent();

    clickButton('Ver todos os indicadores');

    const drawer = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;

    expect(drawer).not.toBeNull();
    expect(drawer.textContent).toContain('Indicadores financeiros');
    expect(drawer.textContent).toContain('Planejamento');
    expect(drawer.textContent).toContain('Realizado');
    expect(drawer.textContent).toContain('Projeção');
    expect(drawer.textContent).toContain('Comparação');
    expect(drawer.textContent).toContain('Compromissos');
    expect(drawer.textContent).toContain('Indicadores por hectare');
    expect(drawer.textContent).toContain('Planejamento');
    expect(drawer.textContent).toContain('Projeção');
    expect(drawer.textContent).toContain('Realizado');
    expect(drawer.querySelectorAll('gd-summary-card').length).toBe(27);
  });

  it('should close the detailed indicators drawer from its close button', async () => {
    setupUser('PRODUCER');
    createComponent();
    clickButton('Ver todos os indicadores');

    (fixture.nativeElement.querySelector('[aria-label="Fechar drawer"]') as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 300));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('should keep transactions available when a 200 summary payload is invalid', () => {
    harvestService.getSummary.mockReturnValue(
      throwError(() => new InvalidHarvestSeasonDetailSummaryError()),
    );
    setupUser('PRODUCER');
    createComponent();

    expect(text()).toContain('Não foi possível interpretar o resumo financeiro da safra.');
    expect(text()).toContain('Venda de soja');
  });

  it('should show isolated errors for summary and transactions', () => {
    harvestService.getSummary.mockReturnValue(throwError(() => new Error('summary')));
    transactionService.listByFarm.mockReturnValue(throwError(() => new Error('transactions')));
    setupUser('PRODUCER');
    createComponent();

    expect(text()).toContain('Não foi possível carregar o resumo financeiro da safra.');
    expect(text()).toContain('Não foi possível carregar as movimentações da safra.');
  });

  it('should navigate to transactions preserving the harvest filter', () => {
    setupUser('PRODUCER');
    createComponent();

    clickButton('Ver todas');

    expect(router.navigate).toHaveBeenCalledWith(['/transactions'], {
      queryParams: { harvestSeasonId: 1 },
    });
  });

  it('should not show status actions before opening the edit drawer', () => {
    setupUser('PRODUCER');
    createComponent();

    expect(editHarvestButton()).toBeTruthy();
    expect(text()).not.toContain('Inativar');
    expect(text()).not.toContain('Reativar');
  });

  it('should show not found message for 404 errors', () => {
    harvestService.getById.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    setupUser('PRODUCER');
    createComponent();

    expect(text()).toContain('Safra não encontrada.');
  });

  it('should remove the former harvest card header and back button', () => {
    setupUser('PRODUCER');
    createComponent();

    expect(
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === 'Safras',
      ),
    ).toBeUndefined();
    expect(text()).not.toContain('Detalhes da safra');
    expect(text()).not.toContain('Acompanhe resultado, indicadores e movimentacoes vinculadas.');
  });

  it('should hide edit and status section for employees', () => {
    setupUser('EMPLOYEE');
    createComponent();

    expect(editHarvestButton()).toBeNull();
    expect(text()).not.toContain('Status da safra');
  });

  it('should hide edit and status section for accountants', () => {
    setupUser('ACCOUNTANT');
    createComponent();

    expect(editHarvestButton()).toBeNull();
    expect(text()).not.toContain('Status da safra');
  });

  it('should show edit for producers', () => {
    setupUser('PRODUCER');
    createComponent();

    expect(editHarvestButton()).toBeTruthy();
  });

  it('should open the edit drawer with the harvest status section for active harvests', () => {
    setupUser('PRODUCER');
    createComponent();

    clickButton('Editar safra');

    expect(text()).toContain('Status da safra');
    expect(text()).toContain('Em andamento');
    expect(text()).toContain('Finalizar safra');
    expect(text()).toContain('Inativar');
  });

  it('should show reactivate action in the drawer for inactive harvests', () => {
    harvestService.getById.mockReturnValue(of({ ...harvest, status: 'INACTIVE' }));
    setupUser('PRODUCER');
    createComponent();

    clickButton('Editar safra');

    expect(text()).toContain('Status da safra');
    expect(text()).toContain('Inativa');
    expect(text()).toContain('Reativar safra');
  });

  it('should inactivate a harvest from the edit drawer after confirmation', () => {
    setupUser('PRODUCER');
    createComponent();

    clickButton('Editar safra');
    clickButton('Inativar safra');
    clickLastButton('Inativar safra');

    expect(harvestService.inactivate).toHaveBeenCalledWith(1);
    expect(harvestService.activate).not.toHaveBeenCalled();
    expect(harvestService.getById).toHaveBeenCalledTimes(2);
  });

  it('should reactivate an inactive harvest from the edit drawer after confirmation', () => {
    harvestService.getById.mockReturnValue(of({ ...harvest, status: 'INACTIVE' }));
    setupUser('PRODUCER');
    createComponent();

    clickButton('Editar safra');
    clickButton('Reativar safra');
    clickLastButton('Reativar safra');

    expect(harvestService.activate).toHaveBeenCalledWith(1);
    expect(harvestService.inactivate).not.toHaveBeenCalled();
    expect(harvestService.getById).toHaveBeenCalledTimes(2);
  });

  it('should start a planned harvest using the status endpoint', () => {
    harvestService.getById.mockReturnValue(of({ ...harvest, status: 'PLANNED' }));
    setupUser('PRODUCER');
    createComponent();

    clickButton('Editar safra');
    clickButton('Iniciar safra');

    expect(harvestService.updateStatus).toHaveBeenCalledWith(1, 'IN_PROGRESS');
  });

  it('should finish an in-progress harvest after confirmation', () => {
    setupUser('PRODUCER');
    createComponent();

    clickButton('Editar safra');
    clickButton('Finalizar safra');
    clickLastButton('Finalizar safra');

    expect(harvestService.updateStatus).toHaveBeenCalledWith(1, 'FINISHED');
  });

  it('should reopen a finished harvest after confirmation', () => {
    harvestService.getById.mockReturnValue(of({ ...harvest, status: 'FINISHED' }));
    setupUser('PRODUCER');
    createComponent();

    clickButton('Editar safra');
    clickButton('Reabrir safra');
    clickLastButton('Reabrir safra');

    expect(harvestService.updateStatus).toHaveBeenCalledWith(1, 'IN_PROGRESS');
  });

  it('should save harvest edits without changing status', () => {
    setupUser('PRODUCER');
    createComponent();
    const component = fixture.componentInstance as unknown as HarvestSeasonDetailsPage & {
      openEditDrawer(): void;
      form: any;
      saveHarvest(): void;
    };

    component.openEditDrawer();
    component.form.patchValue({ name: 'Safra Editada' });
    component.saveHarvest();
    fixture.detectChanges();

    expect(harvestService.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ name: 'Safra Editada', productionActivityId: 2 }),
    );
    expect(harvestService.updateStatus).not.toHaveBeenCalled();
    expect(harvestService.activate).not.toHaveBeenCalled();
    expect(harvestService.inactivate).not.toHaveBeenCalled();
  });

  it('should create an expense budget item and refresh planning totals', () => {
    setupUser('PRODUCER');
    createComponent();
    const component = fixture.componentInstance as unknown as {
      openCreateBudgetItem(type: 'EXPENSE'): void;
      budgetForm: any;
      saveBudgetItem(): void;
    };

    component.openCreateBudgetItem('EXPENSE');
    component.budgetForm.setValue({
      categoryId: 3,
      description: 'Adubação de cobertura',
      plannedAmount: '12.000,00',
    });
    component.saveBudgetItem();

    expect(categoryService.listByFarm).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ type: 'EXPENSE', includeInactive: false }),
    );
    expect(harvestService.createBudgetItem).toHaveBeenCalledWith(1, {
      categoryId: 3,
      type: 'EXPENSE',
      description: 'Adubação de cobertura',
      plannedAmount: 12000,
    });
    expect(harvestService.getBudgetItems).toHaveBeenCalledTimes(2);
    expect(harvestService.getSummary).toHaveBeenCalledTimes(2);
  });

  it('should hide budget actions for a finished harvest season', () => {
    harvestService.getById.mockReturnValue(of({ ...harvest, status: 'FINISHED' }));
    setupUser('PRODUCER');
    createComponent();

    clickButton('Planejamento financeiro');

    expect(text()).not.toContain('Adicionar despesa');
    expect(text()).not.toContain('Remover');
    expect(fixture.nativeElement.querySelector('[data-testid="budget-item-actions"]')).toBeNull();
  });

  it('should use the planning tooltip instead of the informational banner', () => {
    setupUser('PRODUCER');
    createComponent();

    clickButton('Planejamento financeiro');

    const tooltip = fixture.nativeElement.querySelector('gd-tooltip [role="tooltip"]') as HTMLElement;

    expect(tooltip.className).toContain('w-64');
    expect(tooltip.className).toContain('z-[1000]');
    expect(tooltip.textContent).toContain(
      'O planejamento financeiro pode ser ajustado enquanto a Safra estiver Planejada ou Em andamento.',
    );
  });

  it('should render compact planning sections, summary item counts and accessible item actions', () => {
    harvestService.getBudgetItems.mockReturnValue(
      of({
        ...budget,
        plannedExpense: 128000,
        plannedRevenue: 195000,
        plannedResult: 67000,
        plannedMargin: 34.36,
        expenses: [
          {
            categoryId: null,
            categoryName: 'Sem categoria',
            type: 'EXPENSE',
            itemCount: 1,
            plannedAmount: 128000,
            items: [
              {
                id: 9,
                harvestSeasonId: 1,
                categoryId: null,
                categoryName: 'Sem categoria',
                type: 'EXPENSE',
                description: 'Planejamento anterior',
                plannedAmount: 128000,
              },
            ],
          },
        ],
        incomes: [],
      }),
    );
    setupUser('PRODUCER');
    createComponent();

    clickButton('Planejamento financeiro');

    expect(text()).toContain('Despesas planejadas');
    expect(text()).toContain('Receitas planejadas');
    expect(text()).toContain('Resultado planejado');
    expect(text()).toContain('Margem planejada');
    expect(text()).toContain('Sem categoria');
    expect(text()).toContain('1 item');
    expect(summaryCardText('Despesas planejadas')).toContain('1 item');
    expect(summaryCardText('Receitas planejadas')).toContain('0 itens');
    expect(text()).not.toContain('Planejamento anterior');
    expect(fixture.nativeElement.querySelector('[aria-label="Editar"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Remover"]')).toBeNull();
    expect(budgetCategoryButton('Sem categoria')?.getAttribute('aria-expanded')).toBe('false');
    expect(
      fixture.nativeElement.querySelectorAll('gd-summary-card [aria-label^="Explicação sobre"]'),
    ).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('gd-tooltip')).not.toBeNull();
    expect(text()).not.toContain('Nenhum item nesta seção.');
    expect(text()).not.toContain('Movimentações vinculadas');

    clickBudgetCategory('Sem categoria');

    expect(budgetCategoryButton('Sem categoria')?.getAttribute('aria-expanded')).toBe('true');
    expect(text()).toContain('Planejamento anterior');
    expect(fixture.nativeElement.querySelector('[aria-label="Editar"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Remover"]')).not.toBeNull();

    clickButton('Editar');

    expect(text()).toContain('Editar despesa planejada');

    clickButton('Cancelar');
    clickButton('Remover');

    expect(text()).toContain('Remover item do planejamento?');

    clickLastButton('Remover');

    expect(harvestService.deleteBudgetItem).toHaveBeenCalledWith(1, 9);
  });

  it('should show planning create actions only to users that can manage the harvest', () => {
    setupUser('PRODUCER');
    createComponent();
    clickButton('Planejamento financeiro');

    expect(text()).toContain('Adicionar despesa');
    expect(text()).toContain('Adicionar receita');
  });

  it('should render contextual empty states and actions for an authorized user', () => {
    setupUser('PRODUCER');
    createComponent();

    clickButton('Planejamento financeiro');

    expect(text()).toContain('Nenhuma despesa planejada');
    expect(text()).toContain('Nenhuma receita planejada');
    expect(text()).toContain('Adicionar despesa');
    expect(text()).toContain('Adicionar receita');
  });

  it('should keep planning read-only for an employee', () => {
    harvestService.getBudgetItems.mockReturnValue(
      of({
        ...budget,
        expenses: [
          {
            categoryId: null,
            categoryName: 'Sem categoria',
            type: 'EXPENSE',
            itemCount: 1,
            plannedAmount: 100,
            items: [
              {
                id: 9,
                harvestSeasonId: 1,
                categoryId: null,
                categoryName: 'Sem categoria',
                type: 'EXPENSE',
                description: 'Planejamento anterior',
                plannedAmount: 100,
              },
            ],
          },
        ],
      }),
    );
    setupUser('EMPLOYEE');
    createComponent();

    clickButton('Planejamento financeiro');

    expect(text()).not.toContain('Adicionar despesa');
    expect(text()).not.toContain('Adicionar receita');
    expect(text()).not.toContain('Planejamento anterior');

    clickBudgetCategory('Sem categoria');

    expect(text()).toContain('Planejamento anterior');
    expect(fixture.nativeElement.querySelector('[data-testid="budget-item-actions"]')).toBeNull();
  });

  it('should preserve multiple category groups and provide a contextual action for an empty section', () => {
    harvestService.getBudgetItems.mockReturnValue(
      of({
        ...budget,
        plannedExpense: 500,
        expenses: [
          {
            categoryId: 3,
            categoryName: 'Insumos',
            type: 'EXPENSE',
            itemCount: 2,
            plannedAmount: 500,
            items: [
              {
                id: 9,
                harvestSeasonId: 1,
                categoryId: 3,
                categoryName: 'Insumos',
                type: 'EXPENSE',
                description: 'Sementes',
                plannedAmount: 300,
              },
              {
                id: 10,
                harvestSeasonId: 1,
                categoryId: 3,
                categoryName: 'Insumos',
                type: 'EXPENSE',
                description: 'Fertilizante',
                plannedAmount: 200,
              },
            ],
          },
          {
            categoryId: null,
            categoryName: 'Sem categoria',
            type: 'EXPENSE',
            itemCount: 1,
            plannedAmount: 100,
            items: [
              {
                id: 11,
                harvestSeasonId: 1,
                categoryId: null,
                categoryName: 'Sem categoria',
                type: 'EXPENSE',
                description: 'Frete',
                plannedAmount: 100,
              },
            ],
          },
        ],
      }),
    );
    setupUser('PRODUCER');
    createComponent();

    clickButton('Planejamento financeiro');

    expect(text()).toContain('Insumos');
    expect(text()).toContain('Sem categoria');
    expect(summaryCardText('Despesas planejadas')).toContain('3 itens');
    expect(text()).toContain('Nenhuma receita planejada');
    expect(emptyStateText('Nenhuma receita planejada')).toContain('Adicionar receita');
    expect(text()).not.toContain('Sementes');
    expect(text()).not.toContain('Frete');

    clickBudgetCategory('Insumos');
    clickBudgetCategory('Sem categoria');

    expect(budgetCategoryButton('Insumos')?.getAttribute('aria-expanded')).toBe('true');
    expect(budgetCategoryButton('Sem categoria')?.getAttribute('aria-expanded')).toBe('true');
    expect(text()).toContain('Sementes');
    expect(text()).toContain('Fertilizante');
    expect(text()).toContain('Frete');

    clickBudgetCategory('Insumos');

    expect(budgetCategoryButton('Insumos')?.getAttribute('aria-expanded')).toBe('false');
    expect(budgetCategoryButton('Sem categoria')?.getAttribute('aria-expanded')).toBe('true');
    expect(text()).not.toContain('Sementes');
    expect(text()).toContain('Frete');
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
    const button = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find(
      (item) => item.textContent?.trim() === label || item.getAttribute('aria-label') === label,
    );

    button?.click();
    fixture.detectChanges();
  }

  function clickLastButton(label: string): void {
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .reverse()
      .find((item) => item.textContent?.trim() === label);

    button?.click();
    fixture.detectChanges();
  }

  function clickBudgetCategory(name: string): void {
    budgetCategoryButton(name)?.click();
    fixture.detectChanges();
  }

  function budgetCategoryButton(name: string): HTMLButtonElement | undefined {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        'button[aria-controls^="budget-group-"]',
      ),
    ).find((item) => item.textContent?.includes(name));
  }

  function sectionHeadingTexts(): string[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('section[aria-labelledby] h2'),
    ).map((item) => (item.textContent ?? '').replace(/\s+/g, ' ').trim());
  }

  function summaryCardTitles(): string[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('gd-summary-card'),
    ).map((card) => card.querySelector('article p')?.textContent?.trim() ?? '');
  }

  function summaryCardText(title: string): string {
    const card = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('gd-summary-card'),
    ).find((item) => item.textContent?.includes(title));

    return card?.textContent ?? '';
  }

  function emptyStateText(title: string): string {
    const emptyState = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('gd-empty-state'),
    ).find((item) => item.textContent?.includes(title));

    return emptyState?.textContent ?? '';
  }

  function tableHeaderTexts(): string[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('table thead th'),
    ).map((item) => item.textContent?.trim() ?? '');
  }

  function editHarvestButton(): HTMLButtonElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('[aria-label="Editar safra"]');
  }

  function text(): string {
    fixture.detectChanges();
    return fixture.nativeElement.textContent ?? '';
  }
});
