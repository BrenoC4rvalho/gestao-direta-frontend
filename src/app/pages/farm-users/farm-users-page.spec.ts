import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { AuthUser } from '../../core/models/auth.models';
import { FarmAccessResponse } from '../../core/models/farm-access.models';
import { FarmUser } from '../../core/models/farm-user.models';
import { Farm } from '../../core/models/farm.models';
import { PageResponse } from '../../core/models/page-response.model';
import { User } from '../../core/models/user.models';
import { FarmUserService } from '../../core/services/farm-user.service';
import { UserService } from '../../core/services/user.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';

import { FarmUsersPage } from './farm-users-page';

const admin: AuthUser = {
  id: 99,
  name: 'Admin',
  email: 'admin@example.com',
  document: null,
  userType: 'ADMIN',
  status: 'ACTIVE',
};

const producer: AuthUser = {
  id: 1,
  name: 'Produtor',
  email: 'produtor@example.com',
  document: null,
  userType: 'USER',
  status: 'ACTIVE',
};

const farms: Farm[] = [
  {
    id: 10,
    name: 'Fazenda Boa Safra',
    document: null,
    city: 'Ribeirão Preto',
    state: 'SP',
    totalArea: 100,
    productionType: 'AGRICULTURE',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 11,
    name: 'Sítio Santa Clara',
    document: null,
    city: 'Uberaba',
    state: 'MG',
    totalArea: 80,
    productionType: 'MIXED',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  },
];

const farmUsers: FarmUser[] = [
  {
    id: 1,
    farmId: 10,
    farmName: 'Fazenda Boa Safra',
    userId: 1,
    userName: 'Produtor Atual',
    userEmail: 'produtor@example.com',
    role: 'PRODUCER',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 2,
    farmId: 10,
    farmName: 'Fazenda Boa Safra',
    userId: 2,
    userName: 'Maria Funcionária',
    userEmail: 'maria@example.com',
    role: 'EMPLOYEE',
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-04T00:00:00Z',
  },
  {
    id: 3,
    farmId: 10,
    farmName: 'Fazenda Boa Safra',
    userId: 3,
    userName: 'João Contador',
    userEmail: 'joao@example.com',
    role: 'ACCOUNTANT',
    createdAt: '2026-01-05T00:00:00Z',
    updatedAt: '2026-01-06T00:00:00Z',
  },
  {
    id: 4,
    farmId: 10,
    farmName: 'Fazenda Boa Safra',
    userId: 4,
    userName: 'Usuário Inativo',
    userEmail: 'inativo@example.com',
    role: 'INACTIVE',
    createdAt: '2026-01-07T00:00:00Z',
    updatedAt: '2026-01-08T00:00:00Z',
  },
];

const availableUsers: User[] = [
  {
    id: 5,
    name: 'Ana Disponível',
    email: 'ana@example.com',
    document: null,
    userType: 'USER',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 6,
    name: 'Usuário Bloqueado',
    email: 'bloqueado@example.com',
    document: null,
    userType: 'USER',
    status: 'BLOCKED',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 7,
    name: 'Outro Admin',
    email: 'outro-admin@example.com',
    document: null,
    userType: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  },
];

const producerAccess: FarmAccessResponse = {
  farmId: 10,
  farmName: 'Fazenda Boa Safra',
  userId: 1,
  userType: 'USER',
  role: 'PRODUCER',
  permissions: {
    canViewFarm: true,
    canEditFarm: true,
    canChangeFarmStatus: false,
    canManageFarmUsers: true,
    canViewFinancial: true,
    canManageTransactions: true,
    canManageCategories: true,
    canManageGlobalCategories: false,
    canCreateFarm: false,
  },
};

function userPage(content: User[]): PageResponse<User> {
  return {
    content,
    page: 0,
    size: 100,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    first: true,
    last: true,
  };
}

describe('FarmUsersPage', () => {
  let fixture: ComponentFixture<FarmUsersPage>;
  let farmUserService: {
    listByFarm: ReturnType<typeof vi.fn>;
    linkUser: ReturnType<typeof vi.fn>;
    updateRole: ReturnType<typeof vi.fn>;
    inactivate: ReturnType<typeof vi.fn>;
  };
  let userService: { list: ReturnType<typeof vi.fn>; searchByEmail: ReturnType<typeof vi.fn> };
  let selectedFarmStore: SelectedFarmStore;
  let farmAccessStore: FarmAccessStore;
  let sessionStore: SessionStore;
  let toastStore: ToastStore;

  beforeEach(async () => {
    farmUserService = {
      listByFarm: vi.fn().mockReturnValue(of(farmUsers)),
      linkUser: vi.fn().mockReturnValue(of(farmUsers[1])),
      updateRole: vi.fn().mockReturnValue(of({ ...farmUsers[1], role: 'ACCOUNTANT' })),
      inactivate: vi.fn().mockReturnValue(of(undefined)),
    };
    userService = {
      list: vi.fn().mockReturnValue(of(userPage(availableUsers))),
      searchByEmail: vi.fn().mockReturnValue(of(availableUsers[0])),
    };

    await TestBed.configureTestingModule({
      imports: [FarmUsersPage],
      providers: [
        provideGestaoDiretaIcons(),
        { provide: FarmUserService, useValue: farmUserService },
        { provide: UserService, useValue: userService },
      ],
    }).compileComponents();

    selectedFarmStore = TestBed.inject(SelectedFarmStore);
    farmAccessStore = TestBed.inject(FarmAccessStore);
    sessionStore = TestBed.inject(SessionStore);
    toastStore = TestBed.inject(ToastStore);
    selectedFarmStore.clear();
    farmAccessStore.clear();
    sessionStore.clear();
    toastStore.clear();
  });

  afterEach(() => {
    selectedFarmStore.clear();
    farmAccessStore.clear();
    sessionStore.clear();
    toastStore.clear();
  });

  it('should show an empty state and not call the API without a selected farm', () => {
    sessionStore.setUser(admin);
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Nenhuma fazenda selecionada');
    expect(farmUserService.listByFarm).not.toHaveBeenCalled();
  });

  it('should show restricted access and not call the API without permission', () => {
    sessionStore.setUser(producer);
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess({
      ...producerAccess,
      role: 'EMPLOYEE',
      permissions: { ...producerAccess.permissions, canManageFarmUsers: false },
    });

    createPage();

    expect(fixture.nativeElement.textContent).toContain('Acesso restrito');
    expect(farmUserService.listByFarm).not.toHaveBeenCalled();
  });

  it('should load and render farm users for an admin', () => {
    setupAdminFarm();
    createPage();

    expect(farmUserService.listByFarm).toHaveBeenCalledWith(10);
    expect(fixture.nativeElement.textContent).not.toContain('Fazenda selecionada:');
    expect(fixture.nativeElement.textContent).toContain('Maria Funcionária');
    expect(fixture.nativeElement.textContent).toContain('Funcionário');
    expect(fixture.nativeElement.textContent).toContain('João Contador');
    expect(fixture.nativeElement.textContent).toContain('Inativo');
  });

  it('should treat a forbidden list response as restricted access', () => {
    farmUserService.listByFarm.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    setupAdminFarm();
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Acesso restrito');
    expect(findButton(fixture.nativeElement, 'Vincular usuário')).toBeUndefined();
  });

  it('should show skeletons while loading links', () => {
    farmUserService.listByFarm.mockReturnValueOnce(new Subject<FarmUser[]>());
    setupAdminFarm();
    createPage();

    expect(fixture.nativeElement.querySelector('[aria-label="Carregando vínculos"]')).toBeTruthy();
  });

  it('should show the empty state when no links exist', () => {
    farmUserService.listByFarm.mockReturnValueOnce(of([]));
    setupAdminFarm();
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Nenhum vínculo encontrado');
  });

  it('should show an error state and retry loading', () => {
    farmUserService.listByFarm.mockReturnValueOnce(throwError(() => new Error('Falha')));
    setupAdminFarm();
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar os vínculos');
    farmUserService.listByFarm.mockReturnValueOnce(of(farmUsers));
    clickButton('Tentar novamente');

    expect(farmUserService.listByFarm).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Maria Funcionária');
  });

  it('should open the link drawer and load only available active users', () => {
    setupAdminFarm();
    createPage();
    clickButton('Vincular usuário');

    expect(userService.list).toHaveBeenCalledWith({
      page: 0,
      size: 100,
      sort: 'name',
      direction: 'ASC',
    });
    expect(fixture.nativeElement.textContent).toContain('Ana Disponível — ana@example.com');
    expect(fixture.nativeElement.textContent).not.toContain('Usuário Bloqueado — bloqueado@example.com');
    expect(fixture.nativeElement.textContent).not.toContain('Outro Admin — outro-admin@example.com');
  });

  it('should link a user and reload the list', () => {
    setupAdminFarm();
    createPage();
    clickButton('Vincular usuário');
    selectInForm('gd-farm-user-form', 0, 1);
    selectInForm('gd-farm-user-form', 1, 2);
    submitForm('gd-farm-user-form');

    expect(farmUserService.linkUser).toHaveBeenCalledWith(10, {
      userId: 5,
      role: 'EMPLOYEE',
    });
    expect(farmUserService.listByFarm).toHaveBeenCalledTimes(2);
    expect(toastStore.toasts()[0]?.title).toBe('Usuário vinculado com sucesso.');
  });

  it('should update a role and reload the list', () => {
    setupAdminFarm();
    createPage();
    clickButton('Alterar papel');
    selectInForm('gd-farm-user-role-form', 0, 1);
    submitForm('gd-farm-user-role-form');

    expect(farmUserService.updateRole).toHaveBeenCalledWith(10, 1, {
      role: 'EMPLOYEE',
    });
    expect(farmUserService.listByFarm).toHaveBeenCalledTimes(2);
    expect(toastStore.toasts()[0]?.title).toBe('Papel atualizado com sucesso.');
  });

  it('should confirm inactivation and reload the list', () => {
    setupAdminFarm();
    createPage();
    clickButton('Inativar vínculo');

    const dialog = getDialog('gd-confirm-dialog');
    expect(dialog?.textContent).toContain('Inativar vínculo');
    findButton(dialog as HTMLElement, 'Inativar')?.click();
    fixture.detectChanges();

    expect(farmUserService.inactivate).toHaveBeenCalledWith(10, 1);
    expect(farmUserService.listByFarm).toHaveBeenCalledTimes(2);
    expect(toastStore.toasts()[0]?.title).toBe('Vínculo inativado com sucesso.');
  });

  it('should show permission feedback when an action returns 403', () => {
    farmUserService.inactivate.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    setupAdminFarm();
    createPage();
    clickButton('Inativar vínculo');
    findButton(getDialog('gd-confirm-dialog') as HTMLElement, 'Inativar')?.click();
    fixture.detectChanges();

    expect(toastStore.toasts()[0]?.title).toBe(
      'Você não tem permissão para realizar esta ação.',
    );
  });

  it('should open the producer drawer without listing users and allow only employee and accountant roles', () => {
    sessionStore.setUser(producer);
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(producerAccess);
    createPage();
    clickButton('Vincular usuário');

    const form = fixture.nativeElement.querySelector('gd-farm-user-form') as HTMLElement;
    expect(userService.list).not.toHaveBeenCalled();
    expect(form.textContent).not.toContain('Produtor');
    expect(form.textContent).toContain('Funcionário');
    expect(form.textContent).toContain('Contador');
    expect(form.textContent).toContain('Buscar usuário');
  });

  it('should keep producer link submit disabled until a user is found and a role is selected', () => {
    sessionStore.setUser(producer);
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(producerAccess);
    createPage();
    clickButton('Vincular usuário');

    expect(findButton(fixture.nativeElement, 'Vincular')?.disabled).toBe(true);

    setInput('gd-farm-user-form', 0, ' ana@example.com ');
    clickButton('Buscar usuário');

    expect(fixture.nativeElement.textContent).toContain('Ana Disponível');
    expect(findButton(fixture.nativeElement, 'Vincular')?.disabled).toBe(true);

    selectInForm('gd-farm-user-form', 0, 1);

    expect(findButton(fixture.nativeElement, 'Vincular')?.disabled).toBe(false);
  });

  it('should search by email and link the found user for a producer', () => {
    sessionStore.setUser(producer);
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(producerAccess);
    createPage();
    clickButton('Vincular usuário');
    setInput('gd-farm-user-form', 0, ' ana@example.com ');
    clickButton('Buscar usuário');

    expect(userService.searchByEmail).toHaveBeenCalledWith('ana@example.com');
    expect(fixture.nativeElement.textContent).toContain('Ana Disponível');

    selectInForm('gd-farm-user-form', 0, 1);
    submitForm('gd-farm-user-form');

    expect(farmUserService.linkUser).toHaveBeenCalledWith(10, {
      userId: 5,
      role: 'EMPLOYEE',
    });
  });

  it('should clear the found user and disable submit when the email changes after search', () => {
    sessionStore.setUser(producer);
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(producerAccess);
    createPage();
    clickButton('Vincular usuário');
    setInput('gd-farm-user-form', 0, 'ana@example.com');
    clickButton('Buscar usuário');
    selectInForm('gd-farm-user-form', 0, 1);

    expect(fixture.nativeElement.textContent).toContain('Ana Disponível');
    expect(findButton(fixture.nativeElement, 'Vincular')?.disabled).toBe(false);

    setInput('gd-farm-user-form', 0, 'outra@example.com');

    expect(fixture.nativeElement.textContent).not.toContain('Ana Disponível');
    expect(findButton(fixture.nativeElement, 'Vincular')?.disabled).toBe(true);
  });

  it('should show producer search errors', () => {
    userService.searchByEmail.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    sessionStore.setUser(producer);
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(producerAccess);
    createPage();
    clickButton('Vincular usuário');
    setInput('gd-farm-user-form', 0, 'desconhecido@example.com');
    clickButton('Buscar usuário');

    expect(fixture.nativeElement.textContent).toContain('Usuário não encontrado.');
    expect(findButton(fixture.nativeElement, 'Vincular')?.disabled).toBe(true);
  });

  it('should protect the authenticated user link from actions', () => {
    sessionStore.setUser(producer);
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(producerAccess);
    createPage();

    const ownCard = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('article'),
    ).find((article) => article.textContent?.includes('Produtor Atual'));

    expect(ownCard?.textContent).toContain('Seu vínculo — acesso protegido');
    expect(findButton(ownCard as HTMLElement, 'Alterar papel')).toBeUndefined();
    expect(findButton(ownCard as HTMLElement, 'Inativar vínculo')).toBeUndefined();
  });

  it('should reload links when the selected farm changes', () => {
    setupAdminFarm();
    createPage();

    selectedFarmStore.selectFarm(farms[1]);
    fixture.detectChanges();

    expect(farmUserService.listByFarm).toHaveBeenLastCalledWith(11);
    expect(farmUserService.listByFarm).toHaveBeenCalledTimes(2);
  });

  function setupAdminFarm(): void {
    sessionStore.setUser(admin);
    selectedFarmStore.setFarms(farms);
  }

  function createPage(): void {
    fixture = TestBed.createComponent(FarmUsersPage);
    fixture.detectChanges();
  }

  function clickButton(label: string): void {
    findButton(fixture.nativeElement, label)?.click();
    fixture.detectChanges();
  }

  function setInput(selector: string, index: number, value: string): void {
    const root = fixture.nativeElement.querySelector(selector) as HTMLElement;
    const input = root.querySelectorAll<HTMLInputElement>('input')[index];
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function selectInForm(selector: string, index: number, selectedIndex: number): void {
    const root = fixture.nativeElement.querySelector(selector) as HTMLElement;
    const select = root.querySelectorAll<HTMLSelectElement>('select')[index];
    select.selectedIndex = selectedIndex;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function submitForm(selector: string): void {
    const form = fixture.nativeElement.querySelector(`${selector} form`) as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function getDialog(selector: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`${selector} [role="dialog"]`);
  }
});

function findButton(root: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  );
}
