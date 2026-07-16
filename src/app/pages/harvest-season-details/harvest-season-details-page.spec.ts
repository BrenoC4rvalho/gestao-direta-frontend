import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Mock, vi } from 'vitest';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { FinancialTransaction } from '../../core/models/financial-transaction.models';
import { HarvestSeason, HarvestSeasonDetailSummary } from '../../core/models/harvest-season.models';
import { PageResponse } from '../../core/models/page-response.model';
import { ProductionActivity } from '../../core/models/production-activity.models';
import { FinancialTransactionService } from '../../core/services/financial-transaction.service';
import {
  HarvestSeasonService,
  InvalidHarvestSeasonDetailSummaryError,
} from '../../core/services/harvest-season.service';
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
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-02-01T00:00:00',
};

const summary: HarvestSeasonDetailSummary = {
  harvestSeasonId: 25,
  harvestSeasonName: 'Café 2026/2027',
  productionActivityId: 25,
  productionActivityName: 'Café',
  farmId: 8,
  farmName: 'Fazenda Boa Sorte',
  areaHectares: 48,
  planning: { plannedCost: 128000, plannedRevenue: 195000, plannedProfit: 67000 },
  realized: { realizedCost: 0, realizedRevenue: 0, realizedProfit: 0 },
  projection: { projectedCost: 29200, projectedRevenue: 58000, projectedProfit: 28800 },
  comparison: {
    profitPerformanceAmount: -38200,
    profitPerformancePercentage: -57.01,
    profitPerformanceStatus: 'BELOW_PLANNED',
    costVarianceAmount: -98800,
    costVariancePercentage: -77.19,
    costVarianceStatus: 'BELOW_PLANNED',
  },
  openAmounts: {
    pending: { payableAmount: 29200, receivableAmount: 58000 },
    overdue: { payableAmount: 0, receivableAmount: 0 },
  },
  transactionCount: 3,
  incomeCount: 1,
  expenseCount: 2,
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
    update: Mock;
    updateStatus: Mock;
    activate: Mock;
    inactivate: Mock;
  };
  let transactionService: { listByFarm: Mock };
  let productionActivityService: { list: Mock };
  let router: { navigate: Mock };
  let sessionStore: SessionStore;
  let farmAccessStore: FarmAccessStore;

  beforeEach(async () => {
    harvestService = {
      getById: vi.fn(() => of(harvest)),
      getSummary: vi.fn(() => of(summary)),
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

  it('should render the detail summary, harvest information and transactions in order', () => {
    setupUser('PRODUCER');
    createComponent();

    expect(summaryCardTitles()).toEqual([
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
      'A pagar',
      'A receber',
      'Vencidas a pagar',
      'Vencidas a receber',
    ]);
    expect(text()).toContain('98.800,00');
    expect(sectionHeadingTexts()).toContain('Movimentações vinculadas · 3');
    expect(text()).not.toContain('Indicadores por hectare');
    expect(text()).not.toContain('Lucro previsto');
    expect(text()).toContain('Venda de soja');
    expect(sectionHeadingTexts()).toEqual([
      'Resumo financeiro',
      'Informações da safra',
      'Movimentações vinculadas · 3',
    ]);
  });

  it('should render harvest information with name and description', () => {
    setupUser('PRODUCER');
    createComponent();

    expect(text()).toContain('Nome');
    expect(text()).toContain('Safra Soja 2026');
    expect(text()).toContain('Descrição');
    expect(text()).toContain('Safra de verao');
  });

  it('should render transaction type in the desktop table', () => {
    setupUser('PRODUCER');
    createComponent();

    expect(tableHeaderTexts()).toEqual([
      'Data',
      'Descrição',
      'Tipo',
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

    const card = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('gd-summary-card'),
    ).find((item) => item.textContent?.includes('Desvio de custo'));

    expect(
      Array.from(card?.querySelectorAll('div') ?? []).some((item) =>
        item.classList.contains('bg-success/10'),
      ),
    ).toBe(true);
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

  it('should navigate to transactions without query params', () => {
    setupUser('PRODUCER');
    createComponent();

    clickButton('Ver em movimentações');

    expect(router.navigate).toHaveBeenCalledWith(['/transactions']);
  });

  it('should not show direct activate or inactivate actions in the main details screen', () => {
    setupUser('PRODUCER');
    createComponent();

    expect(text()).toContain('Editar');
    expect(text()).not.toContain('Inativar');
    expect(text()).not.toContain('Ativar');
  });

  it('should show not found message for 404 errors', () => {
    harvestService.getById.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
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

  it('should hide edit and status section for employees', () => {
    setupUser('EMPLOYEE');
    createComponent();

    expect(text()).not.toContain('Editar');
    expect(text()).not.toContain('Status da safra');
  });

  it('should hide edit and status section for accountants', () => {
    setupUser('ACCOUNTANT');
    createComponent();

    expect(text()).not.toContain('Editar');
    expect(text()).not.toContain('Status da safra');
  });

  it('should show edit for producers', () => {
    setupUser('PRODUCER');
    createComponent();

    expect(text()).toContain('Editar');
  });

  it('should open the edit drawer with the harvest status section for active harvests', () => {
    setupUser('PRODUCER');
    createComponent();

    clickButton('Editar');

    expect(text()).toContain('Status da safra');
    expect(text()).toContain('Em andamento');
    expect(text()).toContain('Inativar');
  });

  it('should show activate action in the drawer for inactive harvests', () => {
    harvestService.getById.mockReturnValue(of({ ...harvest, status: 'INACTIVE' }));
    setupUser('PRODUCER');
    createComponent();

    clickButton('Editar');

    expect(text()).toContain('Status da safra');
    expect(text()).toContain('Inativa');
    expect(text()).toContain('Ativar');
  });

  it('should inactivate a harvest from the edit drawer after confirmation', () => {
    setupUser('PRODUCER');
    createComponent();

    clickButton('Editar');
    clickButton('Inativar');
    clickLastButton('Inativar');

    expect(harvestService.inactivate).toHaveBeenCalledWith(1);
    expect(harvestService.activate).not.toHaveBeenCalled();
    expect(harvestService.getById).toHaveBeenCalledTimes(2);
  });

  it('should activate an inactive harvest from the edit drawer after confirmation', () => {
    harvestService.getById.mockReturnValue(of({ ...harvest, status: 'INACTIVE' }));
    setupUser('PRODUCER');
    createComponent();

    clickButton('Editar');
    clickButton('Ativar');
    clickLastButton('Ativar');

    expect(harvestService.activate).toHaveBeenCalledWith(1);
    expect(harvestService.inactivate).not.toHaveBeenCalled();
    expect(harvestService.getById).toHaveBeenCalledTimes(2);
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
    ).find((item) => item.textContent?.trim() === label);

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

  function sectionHeadingTexts(): string[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('section[aria-labelledby] h2'),
    ).map((item) => (item.textContent ?? '').replace(/\s+/g, ' ').trim());
  }

  function summaryCardTitles(): string[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('gd-summary-card p.text-xs'),
    ).map((item) => item.textContent?.trim() ?? '');
  }

  function tableHeaderTexts(): string[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('table thead th'),
    ).map((item) => item.textContent?.trim() ?? '');
  }

  function text(): string {
    fixture.detectChanges();
    return fixture.nativeElement.textContent ?? '';
  }
});
