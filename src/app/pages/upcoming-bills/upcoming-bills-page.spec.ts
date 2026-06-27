import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { AuthUser } from '../../core/models/auth.models';
import { FarmAccessResponse } from '../../core/models/farm-access.models';
import { Farm } from '../../core/models/farm.models';
import { UpcomingBill } from '../../core/models/financial.models';
import { PageResponse } from '../../core/models/page-response.model';
import { FinancialTransactionService } from '../../core/services/financial-transaction.service';
import { UpcomingBillService } from '../../core/services/upcoming-bill.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';

import { UpcomingBillsPage } from './upcoming-bills-page';

interface UpcomingBillsPageHarness {
  requestMarkAsPaid(bill: UpcomingBill): void;
  requestCancel(bill: UpcomingBill): void;
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

const pendingBill: UpcomingBill = {
  id: 1,
  description: 'Compra de sementes',
  amount: 2500,
  status: 'PENDING',
  dueDate: dateWithOffset(3),
  farmId: 1,
  categoryId: 1,
  categoryName: 'Insumos',
  paymentMethod: 'PIX',
};

const overdueBill: UpcomingBill = {
  ...pendingBill,
  id: 2,
  description: 'Manutenção atrasada',
  amount: 750,
  status: 'OVERDUE',
  dueDate: dateWithOffset(-1),
  categoryName: 'Manutenção',
  paymentMethod: 'BOLETO',
};

const paidBill: UpcomingBill = {
  ...pendingBill,
  id: 3,
  description: 'Conta paga',
  amount: 500,
  status: 'PAID',
  dueDate: dateWithOffset(10),
  categoryName: 'Serviços',
  paymentMethod: 'CASH',
  paidAt: dateWithOffset(0),
};

function pageResponse(
  content: UpcomingBill[],
  page = 0,
  totalPages = content.length > 0 ? 1 : 0,
): PageResponse<UpcomingBill> {
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

describe('UpcomingBillsPage', () => {
  let fixture: ComponentFixture<UpcomingBillsPage>;
  let upcomingBillService: { listByFarm: ReturnType<typeof vi.fn> };
  let transactionService: {
    markAsPaid: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  };
  let selectedFarmStore: SelectedFarmStore;
  let farmAccessStore: FarmAccessStore;
  let sessionStore: SessionStore;
  let toastStore: ToastStore;

  beforeEach(async () => {
    upcomingBillService = {
      listByFarm: vi.fn().mockReturnValue(of(pageResponse([pendingBill, overdueBill, paidBill]))),
    };
    transactionService = {
      markAsPaid: vi.fn().mockReturnValue(of({ ...pendingBill, status: 'PAID' })),
      cancel: vi.fn().mockReturnValue(of({ ...pendingBill, status: 'CANCELED' })),
    };

    await TestBed.configureTestingModule({
      imports: [UpcomingBillsPage],
      providers: [
        provideGestaoDiretaIcons(),
        { provide: UpcomingBillService, useValue: upcomingBillService },
        { provide: FinancialTransactionService, useValue: transactionService },
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
    fixture = TestBed.createComponent(UpcomingBillsPage);
    fixture.detectChanges();
  }

  it('should avoid API without selected farm', () => {
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Nenhuma fazenda selecionada');
    expect(fixture.nativeElement.textContent).toContain(
      'Selecione uma fazenda para visualizar contas a vencer.',
    );
    expect(upcomingBillService.listByFarm).not.toHaveBeenCalled();
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
    expect(fixture.nativeElement.textContent).toContain(
      'Você não tem permissão para visualizar contas a vencer.',
    );
    expect(upcomingBillService.listByFarm).not.toHaveBeenCalled();
  });

  it('should load and render upcoming bills with selected farm and permission', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    expect(upcomingBillService.listByFarm).toHaveBeenCalledWith(1, {
      page: 0,
      size: 10,
      sort: 'dueDate',
      direction: 'ASC',
    });
    expect(fixture.nativeElement.textContent).toContain('Compra de sementes');
    expect(fixture.nativeElement.textContent).toContain('Manutenção atrasada');
    expect(fixture.nativeElement.textContent).toContain('R$');
    expect(fixture.nativeElement.textContent).toContain('Vencida há 1 dia');
    expect(fixture.nativeElement.textContent).toContain('Vence em 3 dias');
  });

  it('should show empty and error states', () => {
    upcomingBillService.listByFarm.mockReturnValueOnce(of(pageResponse([])));
    selectedFarmStore.setFarms([farm]);
    createPage();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma conta a vencer encontrada');

    upcomingBillService.listByFarm.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    createPage();
    expect(fixture.nativeElement.textContent).toContain(
      'Não foi possível carregar as contas a vencer',
    );
  });

  it('should calculate summary from current filtered page and apply local filters', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Total pendente');
    expect(fixture.nativeElement.textContent).toContain('R$');
    expect(fixture.nativeElement.textContent).toContain('1 ·');

    setStatusFilter('PAID');

    expect(fixture.nativeElement.textContent).toContain('Conta paga');
    expect(fixture.nativeElement.textContent).not.toContain('Compra de sementes');
    expect(upcomingBillService.listByFarm).toHaveBeenCalledTimes(1);
  });

  it('should paginate and reload when selected farm changes', () => {
    upcomingBillService.listByFarm.mockReturnValue(of(pageResponse([pendingBill], 0, 2)));
    selectedFarmStore.setFarms([farm, secondFarm]);
    createPage();

    clickButton('Próxima');
    expect(upcomingBillService.listByFarm).toHaveBeenCalledWith(1, expect.objectContaining({ page: 1 }));

    selectedFarmStore.selectFarmById(2);
    fixture.detectChanges();
    expect(upcomingBillService.listByFarm).toHaveBeenCalledWith(2, expect.objectContaining({ page: 1 }));
  });

  it('should render read-only actions without management permission', () => {
    sessionStore.setUser(user);
    selectedFarmStore.setFarms([farm]);
    farmAccessStore.setAccess({
      ...access,
      permissions: { ...access.permissions, canManageTransactions: false },
    });
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Somente leitura');
    expect(findButton(fixture.nativeElement, 'Marcar como paga')).toBeUndefined();

    const harness = fixture.componentInstance as unknown as UpcomingBillsPageHarness;
    harness.requestMarkAsPaid(pendingBill);
    harness.requestCancel(pendingBill);
    fixture.detectChanges();

    expect(transactionService.markAsPaid).not.toHaveBeenCalled();
    expect(transactionService.cancel).not.toHaveBeenCalled();
    expect(toastStore.toasts()[0]?.title).toBe(
      'Você não tem permissão para realizar esta ação.',
    );
  });

  it('should mark as paid and cancel with confirmation', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    clickButton('Marcar como paga');
    clickDialogButton('Marcar como paga');
    expect(transactionService.markAsPaid).toHaveBeenCalledWith(1, { paymentMethod: 'PIX' });
    expect(toastStore.toasts()[0]?.title).toBe('Conta marcada como paga.');
    expect(upcomingBillService.listByFarm).toHaveBeenCalledTimes(2);

    clickButton('Cancelar');
    clickDialogButton('Cancelar conta');
    expect(transactionService.cancel).toHaveBeenCalledWith(1);
    expect(toastStore.toasts()[1]?.title).toBe('Conta cancelada com sucesso.');
  });

  it('should show permission feedback on action 403', () => {
    transactionService.markAsPaid.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    selectedFarmStore.setFarms([farm]);
    createPage();

    clickButton('Marcar como paga');
    clickDialogButton('Marcar como paga');

    expect(toastStore.toasts()[0]?.title).toBe('Você não tem permissão para realizar esta ação.');
  });

  function setStatusFilter(value: string): void {
    const component = fixture.componentInstance as unknown as {
      filterForm: { controls: { status: { setValue(value: string): void } } };
    };
    component.filterForm.controls.status.setValue(value);
    fixture.detectChanges();
  }

  function clickButton(label: string): void {
    findButton(fixture.nativeElement, label)?.click();
    fixture.detectChanges();
  }

  function clickDialogButton(label: string): void {
    const dialogs = fixture.nativeElement.querySelectorAll('gd-confirm-dialog [role="dialog"]');
    const button = Array.from(dialogs)
      .flatMap((dialog) => Array.from((dialog as HTMLElement).querySelectorAll('button')))
      .find((item) => (item as HTMLButtonElement).textContent?.trim() === label) as
      | HTMLButtonElement
      | undefined;
    button?.click();
    fixture.detectChanges();
  }
});

function findButton(root: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  ) as HTMLButtonElement | undefined;
}

function dateWithOffset(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}
