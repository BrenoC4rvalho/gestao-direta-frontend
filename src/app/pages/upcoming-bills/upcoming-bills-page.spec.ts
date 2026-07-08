import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { AuthUser } from '../../core/models/auth.models';
import { FarmAccessResponse } from '../../core/models/farm-access.models';
import { Farm } from '../../core/models/farm.models';
import { FinancialCategory } from '../../core/models/financial-category.models';
import { FinancialAgendaItem, FinancialAgendaSummary } from '../../core/models/financial-agenda.models';
import { FinancialTransaction } from '../../core/models/financial-transaction.models';
import { HarvestSeason } from '../../core/models/harvest-season.models';
import { PageResponse } from '../../core/models/page-response.model';
import { FinancialAgendaService } from '../../core/services/financial-agenda.service';
import { FinancialCategoryService } from '../../core/services/financial-category.service';
import { FinancialTransactionService } from '../../core/services/financial-transaction.service';
import { HarvestSeasonService } from '../../core/services/harvest-season.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';

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

const category: FinancialCategory = {
  id: 1,
  name: 'Venda de safra',
  type: 'INCOME',
  color: null,
  icon: null,
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const transaction: FinancialTransaction = {
  id: 1,
  description: 'Venda de milho',
  amount: 3000,
  type: 'INCOME',
  status: 'PENDING',
  paymentMethod: 'PIX',
  transactionDate: '2026-07-01',
  dueDate: '2026-07-10',
  paidAt: null,
  notes: null,
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  categoryId: 1,
  categoryName: 'Venda de safra',
  harvestSeasonId: 10,
  harvestSeasonName: 'Milho',
  createdByUserId: 1,
  createdByUserName: 'Admin',
  updatedByUserId: null,
  updatedByUserName: null,
  recordStatus: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('UpcomingBillsPage as Financial Agenda', () => {
  let fixture: ComponentFixture<UpcomingBillsPage>;
  let agendaService: {
    getSummary: ReturnType<typeof vi.fn>;
    getItems: ReturnType<typeof vi.fn>;
  };
  let harvestSeasonService: { list: ReturnType<typeof vi.fn> };
  let transactionService: {
    getById: ReturnType<typeof vi.fn>;
    markAsPaid: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let categoryService: { listByFarm: ReturnType<typeof vi.fn> };
  let toastStore: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
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
    transactionService = {
      getById: vi.fn().mockReturnValue(of(transaction)),
      markAsPaid: vi.fn().mockReturnValue(of({ ...transaction, status: 'PAID' })),
      update: vi.fn().mockReturnValue(of(transaction)),
    };
    categoryService = {
      listByFarm: vi.fn().mockReturnValue(of([category])),
    };
    toastStore = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [UpcomingBillsPage],
      providers: [
        provideGestaoDiretaIcons(),
        { provide: FinancialAgendaService, useValue: agendaService },
        { provide: HarvestSeasonService, useValue: harvestSeasonService },
        { provide: FinancialTransactionService, useValue: transactionService },
        { provide: FinancialCategoryService, useValue: categoryService },
        { provide: ToastStore, useValue: toastStore },
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

  it('should render the six compact agenda summary cards from summary response', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    const cards = fixture.nativeElement.querySelectorAll('gd-summary-card') as NodeListOf<HTMLElement>;
    expect(cards.length).toBe(6);
    expect(Array.from(cards).every((card) => card.getAttribute('density') === 'compact')).toBe(true);
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
    expect(visiblePageText()).not.toContain('Entradas que já venceram e ainda não foram recebidas.');
  });

  it('should render status and type as selects while period and harvest season remain chips', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    expect(filterSelect('Filtro de status')).not.toBeNull();
    expect(filterButtons('Filtro de status').length).toBe(0);
    expect(filterSelect('Filtro de tipo')).not.toBeNull();
    expect(filterButtons('Filtro de tipo').length).toBe(0);
    expect(filterButtons('Filtro de período').map((button) => button.textContent?.trim())).toEqual([
      'Todos',
      '7 dias',
      '15 dias',
      '30 dias',
      '60 dias',
      '90 dias',
    ]);
    expect(filterButtons('Filtro de safra').map((button) => button.textContent?.trim())).toEqual([
      'Todas',
      'Milho · Soja',
      'Feijão · Soja',
    ]);
  });

  it('should render the simplified agenda list without type and category columns', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    expect(text()).toContain('Contas da agenda');
    expect(text()).toContain('Venda de milho');
    expect(text()).toContain('Compra de sementes');
    expect(tableHeaders()).toEqual(['Descrição', 'Safra', 'Vencimento', 'Situação', 'Valor', 'Ação']);
    expect(agendaListText()).not.toContain('Venda de safra');
    expect(agendaListText()).not.toContain('Insumos');
    expect(agendaListText()).not.toContain('A receber');
    expect(agendaListText()).not.toContain('A pagar');
    expect(text()).toContain('Pendente');
    expect(text()).toContain('Vencido');
    expect(text()).toContain('Milho');
    expect(text()).toContain('Sem safra');
    expect(text()).toContain('Vence em 3 dias');
    expect(text()).toContain('Vencido há 6 dias');
  });

  it('should show pay and receive actions only for users that can manage transactions', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    expect(text()).toContain('Marcar como recebida');
    expect(text()).toContain('Marcar como paga');

    sessionStore.setUser(user);
    farmAccessStore.setAccess(access);
    createPage();

    expect(text()).not.toContain('Marcar como recebida');
    expect(text()).not.toContain('Marcar como paga');
  });

  it('should render signed amounts with income and expense color classes', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    const root = fixture.nativeElement as HTMLElement;
    const successAmount = Array.from(root.querySelectorAll<HTMLElement>('.text-success')).find(
      (item) => item.textContent?.includes('+R$'),
    );
    const dangerAmount = Array.from(root.querySelectorAll<HTMLElement>('.text-danger')).find(
      (item) => item.textContent?.includes('-R$'),
    );

    expect(successAmount).toBeTruthy();
    expect(dangerAmount).toBeTruthy();
  });

  it('should open the transaction drawer when an item is clicked', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    editableItem('Venda de milho').click();
    fixture.detectChanges();

    expect(transactionService.getById).toHaveBeenCalledWith(1);
    expect(categoryService.listByFarm).toHaveBeenCalledWith(1, { status: 'ACTIVE' });
    expect(fixture.nativeElement.querySelector('gd-transaction-form')).not.toBeNull();
  });

  it('should not open the drawer when the item action is clicked', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    findButton(fixture.nativeElement, 'Marcar como recebida')?.click();
    fixture.detectChanges();

    expect(transactionService.getById).not.toHaveBeenCalled();
    expect(text()).toContain('Confirmar recebimento?');
  });

  it('should confirm before marking an agenda item as paid or received', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    findButton(fixture.nativeElement, 'Marcar como paga')?.click();
    fixture.detectChanges();

    expect(text()).toContain('Confirmar pagamento?');
    expect(text()).toContain('Essa conta será marcada como paga e sairá da Agenda Financeira.');
    expect(transactionService.markAsPaid).not.toHaveBeenCalled();

    confirmDialogButton('Marcar como paga').click();
    fixture.detectChanges();

    expect(transactionService.markAsPaid).toHaveBeenCalledWith(2, {});
    expect(toastStore.success).toHaveBeenCalledWith('Conta marcada como paga.');
    expect(agendaService.getSummary).toHaveBeenCalledTimes(2);
    expect(agendaService.getItems).toHaveBeenCalledTimes(2);
  });

  it('should show receive success copy for receivable agenda items', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    findButton(fixture.nativeElement, 'Marcar como recebida')?.click();
    fixture.detectChanges();
    confirmDialogButton('Marcar como recebida').click();
    fixture.detectChanges();

    expect(transactionService.markAsPaid).toHaveBeenCalledWith(1, {});
    expect(toastStore.success).toHaveBeenCalledWith('Recebimento confirmado.');
  });

  it('should show an error toast when marking an item fails', () => {
    transactionService.markAsPaid.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    selectedFarmStore.setFarms([farm]);
    createPage();

    findButton(fixture.nativeElement, 'Marcar como paga')?.click();
    fixture.detectChanges();
    confirmDialogButton('Marcar como paga').click();
    fixture.detectChanges();

    expect(toastStore.error).toHaveBeenCalledWith('Não foi possível atualizar a conta.');
  });

  it('should move to the previous page after mutation when the current page has one item', () => {
    agendaService.getItems.mockReturnValue(of(pageResponse([payableItem], 0, 2)));
    selectedFarmStore.setFarms([farm]);
    createPage();
    clickButton('Próxima');
    expect(lastItemsCall()).toEqual(expect.objectContaining({ page: 1 }));

    findButton(fixture.nativeElement, 'Marcar como paga')?.click();
    fixture.detectChanges();
    confirmDialogButton('Marcar como paga').click();
    fixture.detectChanges();

    expect(lastItemsCall()).toEqual(expect.objectContaining({ page: 0 }));
  });

  it('should save edits through the transaction form and reload the agenda', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();
    editableItem('Venda de milho').click();
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('gd-transaction-form form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(transactionService.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ description: 'Venda de milho', type: 'INCOME', amount: 3000 }),
    );
    expect(toastStore.success).toHaveBeenCalledWith('Movimentação atualizada com sucesso.');
    expect(agendaService.getSummary).toHaveBeenCalledTimes(2);
    expect(agendaService.getItems).toHaveBeenCalledTimes(2);
  });

  it('should change status, type and period filters and reset page while reloading data', () => {
    agendaService.getItems.mockReturnValue(of(pageResponse([receivableItem], 0, 2)));
    selectedFarmStore.setFarms([farm]);
    createPage();

    clickButton('Próxima');
    expect(lastItemsCall()).toEqual(expect.objectContaining({ page: 1 }));

    changeSelect('Filtro de status', 'Pendentes');
    expect(lastSummaryCall()).toEqual(expect.objectContaining({ status: 'PENDING' }));
    expect(lastItemsCall()).toEqual(expect.objectContaining({ status: 'PENDING', page: 0 }));

    clickButton('Próxima');
    changeSelect('Filtro de tipo', 'A receber');
    expect(lastSummaryCall()).toEqual(expect.objectContaining({ type: 'RECEIVABLE' }));
    expect(lastItemsCall()).toEqual(expect.objectContaining({ type: 'RECEIVABLE', page: 0 }));

    clickButton('Próxima');
    clickFilter('Filtro de período', '7 dias');
    expect(lastSummaryCall()).toEqual(expect.objectContaining({ periodDays: 7 }));
    expect(lastItemsCall()).toEqual(expect.objectContaining({ periodDays: 7, page: 0 }));
  });

  it('should allow multiple harvest seasons, reset page and clear with Todas', () => {
    agendaService.getItems.mockReturnValue(of(pageResponse([receivableItem], 0, 2)));
    selectedFarmStore.setFarms([farm]);
    createPage();

    clickButton('Próxima');
    clickFilter('Filtro de safra', 'Milho · Soja');
    clickFilter('Filtro de safra', 'Feijão · Soja');
    expect(lastSummaryCall()).toEqual(expect.objectContaining({ harvestSeasonIds: [10, 20] }));
    expect(lastItemsCall()).toEqual(expect.objectContaining({ harvestSeasonIds: [10, 20], page: 0 }));

    clickFilter('Filtro de safra', 'Todas');
    expect(lastSummaryCall()).toEqual(expect.objectContaining({ harvestSeasonIds: [] }));
    expect(lastItemsCall()).toEqual(expect.objectContaining({ harvestSeasonIds: [], page: 0 }));
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

  function lastSummaryCall(): unknown {
    return agendaService.getSummary.mock.calls.at(-1)?.[0];
  }

  function lastItemsCall(): unknown {
    return agendaService.getItems.mock.calls.at(-1)?.[0];
  }

  function clickButton(label: string): void {
    findButton(fixture.nativeElement, label)?.click();
    fixture.detectChanges();
  }

  function clickFilter(groupLabel: string, label: string): void {
    findButton(filterGroup(groupLabel), label)?.click();
    fixture.detectChanges();
  }

  function changeSelect(groupLabel: string, optionLabel: string): void {
    const select = filterSelect(groupLabel);
    const option = Array.from(select.options).find(
      (item) => item.textContent?.trim() === optionLabel,
    );

    if (!option) {
      throw new Error(`Option ${optionLabel} not found`);
    }

    select.value = option.value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function filterSelect(groupLabel: string): HTMLSelectElement {
    return filterGroup(groupLabel).querySelector('select') as HTMLSelectElement;
  }

  function filterButtons(groupLabel: string): HTMLButtonElement[] {
    return Array.from(filterGroup(groupLabel).querySelectorAll('button'));
  }

  function filterGroup(groupLabel: string): HTMLElement {
    return fixture.nativeElement.querySelector(`[aria-label="${groupLabel}"]`) as HTMLElement;
  }

  function visiblePageText(): string {
    const clone = fixture.nativeElement.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[role="tooltip"]').forEach((tooltip) => tooltip.remove());

    return clone.textContent ?? '';
  }

  function agendaListText(): string {
    return (fixture.nativeElement.querySelector('[aria-labelledby="agenda-list-title"]') as HTMLElement)
      .textContent ?? '';
  }

  function tableHeaders(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('thead th')).map((header) =>
      (header as HTMLElement).textContent?.trim() ?? '',
    );
  }

  function editableItem(description: string): HTMLElement {
    const item = fixture.nativeElement.querySelector(
      `[aria-label="Editar movimentação ${description}"]`,
    ) as HTMLElement | null;

    if (!item) {
      throw new Error(`Editable item ${description} not found`);
    }

    return item;
  }

  function confirmDialogButton(label: string): HTMLButtonElement {
    const dialog = fixture.nativeElement.querySelector('section[role="dialog"]') as HTMLElement | null;
    const button = dialog ? findButton(dialog, label) : undefined;

    if (!button) {
      throw new Error(`Confirm dialog button ${label} not found`);
    }

    return button;
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
