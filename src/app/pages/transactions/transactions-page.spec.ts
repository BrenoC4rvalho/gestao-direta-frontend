import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { AuthUser } from '../../core/models/auth.models';
import { FarmAccessResponse } from '../../core/models/farm-access.models';
import { Farm } from '../../core/models/farm.models';
import { FinancialCategory } from '../../core/models/financial-category.models';
import { FinancialTransaction } from '../../core/models/financial-transaction.models';
import { PageResponse } from '../../core/models/page-response.model';
import { FinancialCategoryService } from '../../core/services/financial-category.service';
import { FinancialTransactionService } from '../../core/services/financial-transaction.service';
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
  let categoryService: { listByFarm: ReturnType<typeof vi.fn> };
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
      listByFarm: vi.fn().mockReturnValue(of([category])),
    };

    await TestBed.configureTestingModule({
      imports: [TransactionsPage],
      providers: [
        provideGestaoDiretaIcons(),
        { provide: FinancialTransactionService, useValue: transactionService },
        { provide: FinancialCategoryService, useValue: categoryService },
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
      type: null,
      status: null,
      categoryId: null,
    });
    expect(categoryService.listByFarm).toHaveBeenCalledWith(1);
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

  it('should reload when selected farm changes', () => {
    selectedFarmStore.setFarms([farm, secondFarm]);
    createPage();

    selectedFarmStore.selectFarmById(2);
    fixture.detectChanges();

    expect(transactionService.listByFarm).toHaveBeenCalledWith(expect.objectContaining({ farmId: 2 }));
  });

  function clickButton(label: string): void {
    findButton(fixture.nativeElement, label)?.click();
    fixture.detectChanges();
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

  function setInput(selector: string, value: string): void {
    const input = Array.from(fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>).find((item) => item.id === selector.slice(1)) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function setSelect(selector: string, value: string): void {
    const select = Array.from(fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>).find((item) => item.id === selector.slice(1)) as HTMLSelectElement;
    const option = Array.from(select.options).find((item) => item.value.includes(value));
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

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
