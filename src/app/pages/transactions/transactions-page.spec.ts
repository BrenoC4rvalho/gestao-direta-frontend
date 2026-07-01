import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { AuthUser } from '../../core/models/auth.models';
import { FarmAccessResponse } from '../../core/models/farm-access.models';
import { Farm } from '../../core/models/farm.models';
import { FinancialCategory } from '../../core/models/financial-category.models';
import { FinancialTransaction } from '../../core/models/financial-transaction.models';
import { PageResponse } from '../../core/models/page-response.model';
import { UserOption } from '../../core/models/user.models';
import { FinancialCategoryService } from '../../core/services/financial-category.service';
import { FinancialTransactionService } from '../../core/services/financial-transaction.service';
import { FarmUserService } from '../../core/services/farm-user.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';

import { TransactionsPage } from './transactions-page';

const drawerAnimationDurationMs = 250;
const confirmAnimationDurationMs = 200;

interface TransactionsPageHarness {
  openEditDrawer(transaction: FinancialTransaction): void;
  requestMarkAsPaid(transaction: FinancialTransaction): void;
  requestCancel(transaction: FinancialTransaction): void;
}

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
    canManageTransactions: true,
    canManageCategories: false,
    canManageGlobalCategories: false,
    canCreateFarm: false,
  },
};

const category: FinancialCategory = {
  id: 1,
  name: 'Insumos',
  type: 'EXPENSE',
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  isDefault: false,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const incomeCategory: FinancialCategory = {
  ...category,
  id: 2,
  name: 'Venda de safra',
  type: 'INCOME',
};

const inactiveUsedCategory: FinancialCategory = {
  ...category,
  id: 3,
  name: 'Combustível',
  status: 'INACTIVE',
};

const unusedActiveCategory: FinancialCategory = {
  ...category,
  id: 4,
  name: 'Frete futuro',
};

const secondFarmUsedCategory: FinancialCategory = {
  ...category,
  id: 5,
  farmId: 2,
  farmName: 'Fazenda Santa Clara',
  name: 'Defensivos',
};

const createdByUserOptions: UserOption[] = [
  { id: 2, name: 'Contador' },
  { id: 3, name: 'Maria Silva' },
];

const secondFarmUserOptions: UserOption[] = [
  { id: 4, name: 'José Pereira' },
];

const transaction: FinancialTransaction = {
  id: 1,
  description: 'Compra de sementes',
  amount: 2500,
  type: 'EXPENSE',
  status: 'PENDING',
  paymentMethod: 'PIX',
  transactionDate: '2026-06-21',
  dueDate: '2026-06-30',
  paidAt: null,
  notes: 'Compra para safra',
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  categoryId: 1,
  categoryName: 'Insumos',
  createdByUserId: 2,
  createdByUserName: 'User',
  updatedByUserId: null,
  updatedByUserName: null,
  recordStatus: 'ACTIVE',
  createdAt: '2026-06-21T10:00:00',
  updatedAt: '2026-06-21T10:00:00',
};

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

describe('TransactionsPage', () => {
  let fixture: ComponentFixture<TransactionsPage>;
  let transactionService: {
    listByFarm: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    markAsPaid: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  };
  let categoryService: {
    listByFarm: ReturnType<typeof vi.fn>;
    listUsedInTransactions: ReturnType<typeof vi.fn>;
  };
  let farmUserService: {
    listUserOptions: ReturnType<typeof vi.fn>;
  };
  let selectedFarmStore: SelectedFarmStore;
  let farmAccessStore: FarmAccessStore;
  let sessionStore: SessionStore;
  let toastStore: ToastStore;

  beforeEach(async () => {
    transactionService = {
      listByFarm: vi.fn().mockReturnValue(of(pageResponse([transaction]))),
      getById: vi.fn().mockReturnValue(of(transaction)),
      create: vi.fn().mockReturnValue(of({ ...transaction, id: 2 })),
      update: vi.fn().mockReturnValue(of({ ...transaction, description: 'Atualizada' })),
      delete: vi.fn().mockReturnValue(of(undefined)),
      markAsPaid: vi.fn().mockReturnValue(of({ ...transaction, status: 'PAID' })),
      cancel: vi.fn().mockReturnValue(of({ ...transaction, status: 'CANCELED' })),
    };
    categoryService = {
      listByFarm: vi.fn().mockReturnValue(of([category, incomeCategory, unusedActiveCategory])),
      listUsedInTransactions: vi.fn().mockReturnValue(
        of([category, incomeCategory, inactiveUsedCategory]),
      ),
    };
    farmUserService = {
      listUserOptions: vi.fn().mockReturnValue(of(createdByUserOptions)),
    };

    await TestBed.configureTestingModule({
      imports: [TransactionsPage],
      providers: [
        provideGestaoDiretaIcons(),
        { provide: FinancialTransactionService, useValue: transactionService },
        { provide: FinancialCategoryService, useValue: categoryService },
        { provide: FarmUserService, useValue: farmUserService },
      ],
    }).compileComponents();

    selectedFarmStore = TestBed.inject(SelectedFarmStore);
    farmAccessStore = TestBed.inject(FarmAccessStore);
    sessionStore = TestBed.inject(SessionStore);
    toastStore = TestBed.inject(ToastStore);
    selectedFarmStore.clear();
    farmAccessStore.clear();
    sessionStore.clear();
    sessionStore.setUser(admin);
    toastStore.clear();
  });

  afterEach(() => {
    selectedFarmStore.clear();
    farmAccessStore.clear();
    sessionStore.clear();
    toastStore.clear();
  });

  function createPage(): void {
    fixture = TestBed.createComponent(TransactionsPage);
    fixture.detectChanges();
  }

  it('should avoid API without selected farm', () => {
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Selecione uma fazenda');
    expect(transactionService.listByFarm).not.toHaveBeenCalled();
    expect(categoryService.listByFarm).not.toHaveBeenCalled();
    expect(categoryService.listUsedInTransactions).not.toHaveBeenCalled();
    expect(farmUserService.listUserOptions).not.toHaveBeenCalled();
    expect((fixture.componentInstance as unknown as { createdByUserSelectDisabled: () => boolean }).createdByUserSelectDisabled()).toBe(true);
  });

  it('should show access denied and avoid API without view permission', () => {
    sessionStore.setUser(user);
    selectedFarmStore.setFarms([farm]);
    farmAccessStore.setAccess({
      ...access,
      permissions: { ...access.permissions, canViewFinancial: false },
    });
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Acesso restrito');
    expect(transactionService.listByFarm).not.toHaveBeenCalled();
    expect(categoryService.listByFarm).not.toHaveBeenCalled();
    expect(categoryService.listUsedInTransactions).not.toHaveBeenCalled();
  });

  it('should load and render transactions with selected farm and permission', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    expect(transactionService.listByFarm).toHaveBeenCalledWith({
      farmId: 1,
      page: 0,
      size: 10,
      sort: 'transactionDate',
      direction: 'DESC',
    });
    expect(categoryService.listUsedInTransactions).toHaveBeenCalledWith(1);
    expect(categoryService.listUsedInTransactions.mock.calls[0]).toEqual([1]);
    expect(categoryService.listByFarm).toHaveBeenCalledWith(1);
    expect(categoryService.listByFarm.mock.calls[0]).toEqual([1]);
    expect(fixture.nativeElement.textContent).toContain('Compra de sementes');
    expect(fixture.nativeElement.textContent).toContain('R$');
  });

  it('should show empty and error states', () => {
    transactionService.listByFarm.mockReturnValueOnce(of(pageResponse([])));
    selectedFarmStore.setFarms([farm]);
    createPage();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma movimentação encontrada');

    transactionService.listByFarm.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    createPage();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar as movimentações');
  });

  it('should render simple filters and keep advanced filters hidden initially', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Filtros');
    expect(fixture.nativeElement.textContent).toContain(
      'Filtre por período, tipo, descrição e status de pagamento',
    );
    expect(fixture.nativeElement.textContent).toContain('Período da movimentação');
    expect(fixture.nativeElement.textContent).toContain('Tipo');
    expect(fixture.nativeElement.textContent).toContain('Descrição');
    expect(fixture.nativeElement.textContent).toContain('Status do pagamento');
    expect(findFilterChipGroup('Filtro de status do pagamento')).toBeTruthy();
    expect(findFilterChipGroup('Filtro de forma de pagamento')).toBeTruthy();
    expect(findFilterChipGroup('Filtro de categoria')).toBeNull();
    expect(findButtonByAccessibleName(fixture.nativeElement, 'Aplicar filtros')).toBeTruthy();
    expect(findButtonByAccessibleName(fixture.nativeElement, 'Limpar filtros')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Filtros avançados');
    expect(fixture.nativeElement.textContent).not.toContain('Data de pagamento');
    expect(fixture.nativeElement.textContent).not.toContain('Status do registro');
  });

  it('should toggle advanced filters and render only categories returned by the used endpoint', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    expect(findFilterChipGroup('Filtro de forma de pagamento')).toBeTruthy();
    expect(findFilterChipGroup('Filtro de categoria')).toBeNull();

    clickButton('Filtros avançados');
    expect(fixture.nativeElement.textContent).toContain('Data de pagamento');
    expect(fixture.nativeElement.textContent).toContain('Status do registro');
    expect(fixture.nativeElement.textContent).toContain('Valor mínimo');
    expect(fixture.nativeElement.textContent).toContain('Valor máximo');
    expect(findFilterChipGroup('Filtro de categoria')).toBeTruthy();
    expect(findFilterChipGroup('Filtro de forma de pagamento')).toBeTruthy();
    expect(findChipButton('Filtro de categoria', 'Insumos')).toBeTruthy();
    expect(findChipButton('Filtro de categoria', 'Venda de safra')).toBeTruthy();
    expect(findChipButton('Filtro de categoria', 'Combustível (inativa)')).toBeTruthy();
    expect(findChipButton('Filtro de categoria', 'Frete futuro')).toBeUndefined();

    const minAmountInput = findInput('#transaction-filter-min-amount');
    const maxAmountInput = findInput('#transaction-filter-max-amount');

    expect(minAmountInput.closest('gd-input')?.textContent).toContain('R$');
    expect(maxAmountInput.closest('gd-input')?.textContent).toContain('R$');

    clickButton('Filtros avançados');
    expect(fixture.nativeElement.textContent).not.toContain('Data de pagamento');
    expect(findFilterChipGroup('Filtro de categoria')).toBeNull();
  });

  it('should show an empty state when no categories were used in transactions', () => {
    categoryService.listUsedInTransactions.mockReturnValueOnce(of([]));
    selectedFarmStore.setFarms([farm]);
    createPage();

    clickButton('Filtros avançados');

    expect(findFilterChipGroup('Filtro de categoria')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Nenhuma categoria usada em movimentações.',
    );
  });

  it('should keep the page working and show a toast when used categories fail to load', () => {
    categoryService.listUsedInTransactions
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })))
      .mockReturnValue(of([]));
    selectedFarmStore.setFarms([farm]);
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Compra de sementes');
    clickButton('Filtros avançados');
    expect(fixture.nativeElement.textContent).toContain(
      'Nenhuma categoria usada em movimentações.',
    );
    expect(toastStore.toasts()[0]?.title).toBe(
      'Não foi possível carregar as categorias usadas nas movimentações.',
    );
  });

  it('should load created-by options, keep the placeholder and enable the select after loading', () => {
    const userOptionsSubject = new Subject<UserOption[]>();
    farmUserService.listUserOptions.mockReturnValueOnce(userOptionsSubject.asObservable());
    selectedFarmStore.setFarms([farm]);
    createPage();

    clickButton('Filtros avançados');

    expect(farmUserService.listUserOptions).toHaveBeenCalledWith(1);
    expect(findSelect('#transaction-filter-created-by').disabled).toBe(true);
    expect(getSelectOptionTexts('#transaction-filter-created-by')).toEqual([
      'Todos os usuários',
      'Carregando usuários...',
    ]);

    userOptionsSubject.next(createdByUserOptions);
    userOptionsSubject.complete();
    fixture.detectChanges();

    expect(findSelect('#transaction-filter-created-by').disabled).toBe(false);
    expect(getSelectOptionTexts('#transaction-filter-created-by')).toEqual([
      'Todos os usuários',
      'Contador',
      'Maria Silva',
    ]);
  });

  it('should render selected quick filter chips with the solid green active state', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    clickButton('Filtros avançados');
    clickFilterChip('Filtro de categoria', 'Insumos');

    const selectedChip = findChipButton('Filtro de categoria', 'Insumos');
    const idleChip = findChipButton('Filtro de status do pagamento', 'Pendente');

    expect(selectedChip?.className).toContain('border-primary');
    expect(selectedChip?.className).toContain('bg-primary');
    expect(selectedChip?.className).toContain('text-white');
    expect(idleChip?.className).toContain('border-border');
    expect(idleChip?.className).toContain('text-text-primary');
  });

  it('should apply inactive used categories with categoryIds', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    clickButton('Filtros avançados');
    clickFilterChip('Filtro de categoria', 'Combustível (inativa)');

    expect(lastListParams()).toEqual(expect.objectContaining({
      farmId: 1,
      page: 0,
      categoryIds: [3],
    }));
  });

  it('should apply quick filters immediately and reset pagination', () => {
    transactionService.listByFarm.mockImplementation((params: { page?: number }) =>
      of({
        ...pageResponse([transaction]),
        page: params.page ?? 0,
        totalPages: 2,
        first: (params.page ?? 0) === 0,
        last: (params.page ?? 0) === 1,
      }),
    );
    selectedFarmStore.setFarms([farm]);
    createPage();

    clickButton('Próxima');
    expect(lastListParams()).toEqual(expect.objectContaining({ page: 1 }));

    clickFilterChip('Filtro de status do pagamento', 'Pendente');
    expect(lastListParams()).toEqual(expect.objectContaining({
      farmId: 1,
      page: 0,
      paymentStatuses: ['PENDING'],
    }));

    clickFilterChip('Filtro de forma de pagamento', 'PIX');
    expect(lastListParams()).toEqual(expect.objectContaining({
      farmId: 1,
      page: 0,
      paymentStatuses: ['PENDING'],
      paymentMethods: ['PIX'],
    }));

    clickButton('Filtros avançados');
    clickFilterChip('Filtro de categoria', 'Insumos');
    expect(lastListParams()).toEqual(expect.objectContaining({
      farmId: 1,
      page: 0,
      categoryIds: [1],
      paymentStatuses: ['PENDING'],
      paymentMethods: ['PIX'],
    }));

    clickFilterChip('Filtro de categoria', 'Todas');
    expect(lastListParams()).toEqual(expect.objectContaining({
      farmId: 1,
      page: 0,
      categoryIds: [],
      paymentStatuses: ['PENDING'],
      paymentMethods: ['PIX'],
    }));
  });

  it('should apply createdByUserId when a specific user is selected', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    clickButton('Filtros avançados');
    setSelect('#transaction-filter-created-by', '3');
    clickButtonByAccessibleName('Aplicar filtros');

    expect(lastListParams()).toEqual(expect.objectContaining({
      farmId: 1,
      createdByUserId: 3,
    }));
  });

  it('should omit createdByUserId when all users is selected', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    clickButton('Filtros avançados');
    setSelect('#transaction-filter-created-by', '3');
    clickButtonByAccessibleName('Aplicar filtros');
    setSelect('#transaction-filter-created-by', '');
    clickButtonByAccessibleName('Aplicar filtros');

    expect(lastListParams()['createdByUserId']).toBeUndefined();
  });

  it('should keep manual filters pending until apply and merge them with quick filters', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();
    const initialCalls = transactionService.listByFarm.mock.calls.length;

    setInput('#transaction-filter-date-start', '2026-06-01');
    setInput('#transaction-filter-date-end', '2026-06-30');
    setSelect('#transaction-filter-type', 'EXPENSE');
    setInput('#transaction-filter-description', 'sementes');

    expect(transactionService.listByFarm).toHaveBeenCalledTimes(initialCalls);

    clickButton('Filtros avançados');
    clickFilterChip('Filtro de categoria', 'Insumos');

    expect(lastListParams()).toEqual(expect.objectContaining({
      farmId: 1,
      page: 0,
      categoryIds: [1],
    }));
    expect(lastListParams()['description']).toBeUndefined();
    expect(lastListParams()['transactionDateStart']).toBeUndefined();
    expect(lastListParams()['type']).toBeUndefined();

    setInput('#transaction-filter-paid-start', '2026-06-10');
    setInput('#transaction-filter-paid-end', '2026-06-20');
    setSelect('#transaction-filter-record-status', 'ACTIVE');
    setInput('#transaction-filter-min-amount', '99,99');
    setInput('#transaction-filter-max-amount', '1000,50');

    expect(findInput('#transaction-filter-min-amount').value).toBe('99,99');
    expect(findInput('#transaction-filter-max-amount').value).toBe('1000,50');
    expect(lastListParams()).toEqual(expect.objectContaining({
      farmId: 1,
      page: 0,
      categoryIds: [1],
    }));

    clickButtonByAccessibleName('Aplicar filtros');

    expect(lastListParams()).toEqual(expect.objectContaining({
      farmId: 1,
      page: 0,
      transactionDateStart: '2026-06-01',
      transactionDateEnd: '2026-06-30',
      paidAtStart: '2026-06-10',
      paidAtEnd: '2026-06-20',
      type: 'EXPENSE',
      categoryIds: [1],
      recordStatus: 'ACTIVE',
      description: 'sementes',
      minAmount: 99.99,
      maxAmount: 1000.5,
    }));
  });

  it('should clear all filters and reload without extra params', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    setInput('#transaction-filter-description', 'sementes');
    clickFilterChip('Filtro de status do pagamento', 'Pendente');
    clickFilterChip('Filtro de forma de pagamento', 'PIX');
    clickButton('Filtros avançados');
    clickFilterChip('Filtro de categoria', 'Insumos');
    setSelect('#transaction-filter-created-by', '3');
    setInput('#transaction-filter-min-amount', '99,99');
    clickButtonByAccessibleName('Aplicar filtros');
    clickButtonByAccessibleName('Limpar filtros');

    expect(lastListParams()).toEqual({
      farmId: 1,
      page: 0,
      size: 10,
      sort: 'transactionDate',
      direction: 'DESC',
    });
    expect(getSelectOptionTexts('#transaction-filter-created-by')).toEqual([
      'Todos os usuários',
      'Contador',
      'Maria Silva',
    ]);
  });

  it('should count createdByUserId in the advanced filters label', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    clickButton('Filtros avançados');
    setSelect('#transaction-filter-created-by', '3');
    clickButtonByAccessibleName('Aplicar filtros');

    expect(findButton(fixture.nativeElement, 'Filtros avançados (1)')).toBeTruthy();
  });

  it('should count category as advanced filter but not payment method', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    clickFilterChip('Filtro de forma de pagamento', 'PIX');
    expect(findButton(fixture.nativeElement, 'Filtros avançados')).toBeTruthy();

    clickButton('Filtros avançados');
    clickFilterChip('Filtro de categoria', 'Insumos');
    expect(findButton(fixture.nativeElement, 'Filtros avançados (1)')).toBeTruthy();
  });

  it('should reset page when applying filters and keep filters on pagination', () => {
    transactionService.listByFarm.mockReturnValue(of({
      ...pageResponse([transaction]),
      totalPages: 2,
      last: false,
    }));
    selectedFarmStore.setFarms([farm]);
    createPage();

    setInput('#transaction-filter-description', 'sementes');
    clickButtonByAccessibleName('Aplicar filtros');
    clickButton('Próxima');
    expect(lastListParams()).toEqual(expect.objectContaining({ page: 1, description: 'sementes' }));

    setInput('#transaction-filter-description', 'sementes novas');
    clickButtonByAccessibleName('Aplicar filtros');
    expect(lastListParams()).toEqual(expect.objectContaining({ page: 0, description: 'sementes novas' }));
  });

  it('should clear incompatible category when type changes', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    clickButton('Filtros avançados');
    clickFilterChip('Filtro de categoria', 'Insumos');
    setSelect('#transaction-filter-type', 'INCOME');
    fixture.detectChanges();

    expect(findChipButton('Filtro de categoria', 'Insumos')).toBeUndefined();
    expect(findChipButton('Filtro de categoria', 'Venda de safra')).toBeTruthy();
    clickButtonByAccessibleName('Aplicar filtros');
    expect(lastListParams()).toEqual(expect.objectContaining({ type: 'INCOME', categoryIds: [] }));
  });

  it('should show filtered empty state message when filters are active', () => {
    transactionService.listByFarm.mockReturnValue(of(pageResponse([])));
    selectedFarmStore.setFarms([farm]);
    createPage();

    expect(fixture.nativeElement.textContent).toContain('As receitas e despesas da fazenda aparecerão aqui.');

    setInput('#transaction-filter-description', 'sem resultado');
    clickButtonByAccessibleName('Aplicar filtros');

    expect(fixture.nativeElement.textContent).toContain(
      'Nenhuma movimentação encontrada para os filtros informados.',
    );
  });

  it('should keep the create and edit form using only active categories from the old endpoint', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();
    clickButton('Nova movimentação');

    const categoryOptions = getSelectOptionTexts('#transaction-category');

    expect(categoryService.listByFarm).toHaveBeenCalledWith(1);
    expect(categoryOptions).toContain('Insumos');
    expect(categoryOptions).toContain('Frete futuro');
    expect(categoryOptions).not.toContain('Combustível');
    expect(categoryOptions).not.toContain('Combustível (inativa)');
  });

  it('should show create button only with management permission', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();
    expect(findButton(fixture.nativeElement, 'Nova movimentação')).toBeTruthy();

    sessionStore.setUser(user);
    farmAccessStore.setAccess({
      ...access,
      permissions: { ...access.permissions, canManageTransactions: false },
    });
    createPage();
    expect(findButton(fixture.nativeElement, 'Nova movimentação')).toBeUndefined();
  });

  it('should create a transaction and reload', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();
    clickButton('Nova movimentação');
    fillForm('Compra nova');
    submitForm();

    expect(transactionService.create).toHaveBeenCalledWith({
      description: 'Compra nova',
      amount: 2500,
      type: 'EXPENSE',
      status: 'PENDING',
      paymentMethod: 'PIX',
      transactionDate: '2026-06-21',
      dueDate: null,
      paidAt: null,
      notes: null,
      categoryId: 1,
      farmId: 1,
    });
    expect(transactionService.listByFarm).toHaveBeenCalledTimes(2);
    expect(toastStore.toasts()[0]?.title).toBe('Movimentação criada com sucesso.');
  });

  it('should update a transaction and reload', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();
    clickButton('Editar');
    fillForm('Compra atualizada');
    submitForm();

    expect(transactionService.update).toHaveBeenCalledWith(1, expect.objectContaining({
      description: 'Compra atualizada',
      amount: 2500,
    }));
    expect(toastStore.toasts()[0]?.title).toBe('Movimentação atualizada com sucesso.');
  });

  it('should mark as paid and cancel with confirmation', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    clickButton('Marcar paga');
    clickDialogButton('Marcar paga');
    expect(transactionService.markAsPaid).toHaveBeenCalledWith(1, { paymentMethod: 'PIX' });
    expect(toastStore.toasts()[0]?.title).toBe('Movimentação marcada como paga.');

    clickButton('Cancelar');
    clickDialogButton('Cancelar movimentação');
    expect(transactionService.cancel).toHaveBeenCalledWith(1);
    expect(toastStore.toasts()[1]?.title).toBe('Movimentação cancelada com sucesso.');
  });

  it('should close the drawer on Escape when it is open', async () => {
    selectedFarmStore.setFarms([farm]);
    createPage();
    clickButton('Nova movimentação');

    pressEscape();
    await finishDrawerClose();

    expect(getDrawerDialog()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Nova movimentação');
  });

  it('should close only the top confirmation on Escape when a drawer is open behind it', async () => {
    selectedFarmStore.setFarms([farm]);
    createPage();
    clickButton('Editar');
    clickButton('Marcar paga');

    pressEscape();
    await finishConfirmClose();

    expect(getConfirmDialog()).toBeNull();
    expect(getDrawerDialog()).toBeTruthy();
    expect(transactionService.markAsPaid).not.toHaveBeenCalled();
  });

  it('should block handlers without management permission', () => {
    sessionStore.setUser(user);
    selectedFarmStore.setFarms([farm]);
    farmAccessStore.setAccess({
      ...access,
      permissions: { ...access.permissions, canManageTransactions: false },
    });
    createPage();

    const harness = fixture.componentInstance as unknown as TransactionsPageHarness;
    harness.openEditDrawer(transaction);
    harness.requestMarkAsPaid(transaction);
    harness.requestCancel(transaction);
    fixture.detectChanges();

    expect(transactionService.update).not.toHaveBeenCalled();
    expect(transactionService.markAsPaid).not.toHaveBeenCalled();
    expect(transactionService.cancel).not.toHaveBeenCalled();
    expect(toastStore.toasts()[0]?.title).toBe(
      'Você não tem permissão para realizar esta ação.',
    );
  });

  it('should keep the page working and show a toast when created-by options fail to load', () => {
    farmUserService.listUserOptions.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    selectedFarmStore.setFarms([farm]);
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Compra de sementes');
    clickButton('Filtros avançados');
    expect(findSelect('#transaction-filter-created-by').disabled).toBe(false);
    expect(getSelectOptionTexts('#transaction-filter-created-by')).toEqual(['Todos os usuários']);
    expect(toastStore.toasts()[0]?.title).toBe('Não foi possível carregar os usuários da fazenda.');
  });

  it('should clear createdByUserId and reload user options when selected farm changes', () => {
    farmUserService.listUserOptions.mockImplementation((farmId: number) =>
      of(farmId === 1 ? createdByUserOptions : secondFarmUserOptions),
    );
    selectedFarmStore.setFarms([farm, secondFarm]);
    createPage();

    clickButton('Filtros avançados');
    setSelect('#transaction-filter-created-by', '3');
    clickButtonByAccessibleName('Aplicar filtros');
    expect(lastListParams()).toEqual(expect.objectContaining({ farmId: 1, createdByUserId: 3 }));

    selectedFarmStore.selectFarmById(2);
    fixture.detectChanges();

    expect(farmUserService.listUserOptions).toHaveBeenCalledWith(2);
    expect(findSelect('#transaction-filter-created-by').value).toBe('');
    expect(lastListParams()).toEqual(expect.objectContaining({ farmId: 2 }));
    expect(lastListParams()['createdByUserId']).toBeUndefined();
    expect(getSelectOptionTexts('#transaction-filter-created-by')).toEqual([
      'Todos os usuários',
      'José Pereira',
    ]);
  });

  it('should clear categoryIds and reload used categories when selected farm changes', () => {
    categoryService.listUsedInTransactions.mockImplementation((farmId: number) =>
      of(farmId === 1 ? [category, inactiveUsedCategory] : [secondFarmUsedCategory]),
    );
    categoryService.listByFarm.mockImplementation((farmId: number) =>
      of(farmId === 1 ? [category, incomeCategory, unusedActiveCategory] : [secondFarmUsedCategory]),
    );
    selectedFarmStore.setFarms([farm, secondFarm]);
    createPage();

    clickButton('Filtros avançados');
    clickFilterChip('Filtro de categoria', 'Insumos');
    expect(lastListParams()).toEqual(expect.objectContaining({ farmId: 1, categoryIds: [1] }));

    selectedFarmStore.selectFarmById(2);
    fixture.detectChanges();

    expect(transactionService.listByFarm).toHaveBeenCalledWith(
      expect.objectContaining({ farmId: 2, categoryIds: [] }),
    );
    expect(categoryService.listUsedInTransactions).toHaveBeenCalledWith(2);
    expect(findChipButton('Filtro de categoria', 'Insumos')).toBeUndefined();
    expect(findChipButton('Filtro de categoria', 'Defensivos')).toBeTruthy();
  });

  function lastListParams(): Record<string, unknown> {
    const calls = transactionService.listByFarm.mock.calls;
    return calls[calls.length - 1][0];
  }

  function clickButton(label: string): void {
    findButton(fixture.nativeElement, label)?.click();
    fixture.detectChanges();
  }

  function clickButtonByAccessibleName(label: string): void {
    findButtonByAccessibleName(fixture.nativeElement, label)?.click();
    fixture.detectChanges();
  }

  function clickFilterChip(groupLabel: string, label: string): void {
    findChipButton(groupLabel, label)?.click();
    fixture.detectChanges();
  }

  function findFilterChipGroup(label: string): HTMLElement | null {
    return fixture.nativeElement.querySelector('[aria-label="' + label + '"]');
  }

  function findChipButton(groupLabel: string, label: string): HTMLButtonElement | undefined {
    const group = findFilterChipGroup(groupLabel);

    if (!group) {
      return undefined;
    }

    return findButton(group, label);
  }

  function clickDialogButton(label: string): void {
    const dialogs = fixture.nativeElement.querySelectorAll('gd-confirm-dialog [role="dialog"]');
    const button = Array.from(dialogs)
      .flatMap((dialog) => Array.from((dialog as HTMLElement).querySelectorAll('button')))
      .find((item) => (item as HTMLButtonElement).textContent?.trim() === label) as HTMLButtonElement | undefined;
    button?.click();
    fixture.detectChanges();
  }

  function pressEscape(): void {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
  }

  async function finishDrawerClose(): Promise<void> {
    await wait(drawerAnimationDurationMs + 10);
    fixture.detectChanges();
  }

  async function finishConfirmClose(): Promise<void> {
    await wait(confirmAnimationDurationMs + 10);
    fixture.detectChanges();
  }

  function getDrawerDialog(): HTMLElement | null {
    return fixture.nativeElement.querySelector('gd-drawer [role="dialog"]');
  }

  function getConfirmDialog(): HTMLElement | null {
    return fixture.nativeElement.querySelector('gd-confirm-dialog [role="dialog"]');
  }

  function fillForm(description: string): void {
    setInput('#transaction-description', description);
    setInput('#transaction-amount', '2500');
    setSelect('#transaction-category', '1');
    setInput('#transaction-date', '2026-06-21');
    setSelect('#transaction-payment-method', 'PIX');
  }

  function submitForm(): void {
    const form = fixture.nativeElement.querySelector('gd-transaction-form form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function findInput(selector: string): HTMLInputElement {
    return Array.from(
      fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>,
    ).find((item) => item.id === selector.slice(1)) as HTMLInputElement;
  }

  function setInput(selector: string, value: string): void {
    const input = findInput(selector);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function findSelect(selector: string): HTMLSelectElement {
    return Array.from(
      fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>,
    ).find((item) => item.id === selector.slice(1)) as HTMLSelectElement;
  }

  function getSelectOptionTexts(selector: string): string[] {
    return Array.from(findSelect(selector).options)
      .map((option) => option.textContent?.trim() ?? '')
      .filter((option) => option.length > 0);
  }

  function setSelect(selector: string, value: string): void {
    const select = findSelect(selector);
    const option = Array.from(select.options).find((item) =>
      value === '' ? item.value === '' : item.value === value || item.value.includes(value),
    );
    select.selectedIndex = option?.index ?? 0;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }
});

function findButton(root: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  );
}

function findButtonByAccessibleName(root: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find(
    (button) => button.getAttribute('aria-label') === label || button.textContent?.trim() === label,
  );
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
