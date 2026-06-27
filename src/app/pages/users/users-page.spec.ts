import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { AuthUser } from '../../core/models/auth.models';
import { FarmAccessResponse } from '../../core/models/farm-access.models';
import { Farm } from '../../core/models/farm.models';
import { PageResponse } from '../../core/models/page-response.model';
import { User } from '../../core/models/user.models';
import { UserService } from '../../core/services/user.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';

import { UsersPage } from './users-page';

const admin: AuthUser = {
  id: 1,
  name: 'Admin',
  email: 'admin@example.com',
  document: null,
  userType: 'ADMIN',
  status: 'ACTIVE',
};


const producer: AuthUser = {
  id: 3,
  name: 'Produtor',
  email: 'produtor@example.com',
  document: null,
  userType: 'USER',
  status: 'ACTIVE',
};

const farm: Farm = {
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
};

const producerAccess: FarmAccessResponse = {
  farmId: 10,
  farmName: 'Fazenda Boa Safra',
  userId: 3,
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

const users: User[] = [
  {
    id: 1,
    name: 'Maria Silva',
    email: 'maria@example.com',
    document: '123.456.789-00',
    userType: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-10T00:00:00Z',
  },
  {
    id: 2,
    name: 'João Souza',
    email: 'joao@example.com',
    document: null,
    userType: 'USER',
    status: 'BLOCKED',
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-11T00:00:00Z',
  },
];

function pageResponse(
  content: User[],
  page = 0,
  totalPages = content.length > 0 ? 1 : 0,
): PageResponse<User> {
  return {
    content,
    page,
    size: 10,
    totalElements: content.length,
    totalPages,
    first: page === 0,
    last: page === totalPages - 1,
  };
}

describe('UsersPage', () => {
  let fixture: ComponentFixture<UsersPage>;
  let userService: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateStatus: ReturnType<typeof vi.fn>;
    updateType: ReturnType<typeof vi.fn>;
  };
  let selectedFarmStore: SelectedFarmStore;
  let farmAccessStore: FarmAccessStore;
  let sessionStore: SessionStore;
  let toastStore: ToastStore;

  beforeEach(async () => {
    userService = {
      list: vi.fn().mockReturnValue(of(pageResponse(users))),
      create: vi.fn().mockReturnValue(of(users[0])),
      updateStatus: vi.fn().mockReturnValue(of(users[1])),
      updateType: vi.fn().mockReturnValue(of(users[1])),
    };

    await TestBed.configureTestingModule({
      imports: [UsersPage],
      providers: [
        provideGestaoDiretaIcons(),
        { provide: UserService, useValue: userService },
      ],
    }).compileComponents();

    selectedFarmStore = TestBed.inject(SelectedFarmStore);
    farmAccessStore = TestBed.inject(FarmAccessStore);
    sessionStore = TestBed.inject(SessionStore);
    toastStore = TestBed.inject(ToastStore);
    selectedFarmStore.clear();
    farmAccessStore.clear();
    selectedFarmStore.clear();
    farmAccessStore.clear();
    sessionStore.clear();
    toastStore.clear();
  });

  afterEach(() => {
    selectedFarmStore.clear();
    farmAccessStore.clear();
    selectedFarmStore.clear();
    farmAccessStore.clear();
    sessionStore.clear();
    toastStore.clear();
  });

  function createPage(): void {
    fixture = TestBed.createComponent(UsersPage);
    fixture.detectChanges();
  }

  it('should show farm selection guidance without calling the API for a non-admin user without farm', () => {
    sessionStore.setUser(producer);

    createPage();

    expect(fixture.nativeElement.textContent).toContain('Nenhuma fazenda selecionada');
    expect(userService.list).not.toHaveBeenCalled();
    expect(findButton(fixture.nativeElement, 'Novo usuário')).toBeUndefined();
  });

  it('should deny access without calling the API for a non-admin user without permission', () => {
    sessionStore.setUser(producer);
    selectedFarmStore.setFarms([farm]);
    farmAccessStore.setAccess({
      ...producerAccess,
      permissions: { ...producerAccess.permissions, canManageFarmUsers: false },
    });

    createPage();

    expect(fixture.nativeElement.textContent).toContain('Acesso restrito');
    expect(fixture.nativeElement.textContent).toContain(
      'Você não tem permissão para visualizar usuários.',
    );
    expect(userService.list).not.toHaveBeenCalled();
    expect(findButton(fixture.nativeElement, 'Novo usuário')).toBeUndefined();
  });

  it('should load and render users for an admin', () => {
    sessionStore.setUser(admin);

    createPage();

    expect(userService.list).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ASC',
    });

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Maria Silva');
    expect(text).toContain('maria@example.com');
    expect(text).toContain('Administrador');
    expect(text).toContain('Ativo');
    expect(text).toContain('João Souza');
    expect(text).toContain('Usuário');
    expect(text).toContain('Bloqueado');
  });

  it('should show skeletons while loading', () => {
    userService.list.mockReturnValueOnce(new Subject<PageResponse<User>>());
    sessionStore.setUser(admin);

    createPage();

    expect(
      fixture.nativeElement.querySelector('[aria-label="Carregando usuários"]'),
    ).toBeTruthy();
  });

  it('should show the empty state', () => {
    userService.list.mockReturnValueOnce(of(pageResponse([])));
    sessionStore.setUser(admin);

    createPage();

    expect(fixture.nativeElement.textContent).toContain('Nenhum usuário encontrado');
    expect(fixture.nativeElement.textContent).toContain(
      'Quando houver usuários cadastrados, eles aparecerão aqui.',
    );
  });

  it('should show an error state and retry loading', () => {
    userService.list.mockReturnValueOnce(throwError(() => new Error('Falha')));
    sessionStore.setUser(admin);

    createPage();

    expect(fixture.nativeElement.textContent).toContain(
      'Não foi possível carregar os usuários',
    );

    userService.list.mockReturnValueOnce(of(pageResponse(users)));
    findButton(fixture.nativeElement, 'Tentar novamente')?.click();
    fixture.detectChanges();

    expect(userService.list).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Maria Silva');
  });

  it('should handle a forbidden API response as restricted access', () => {
    userService.list.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    sessionStore.setUser(admin);

    createPage();

    expect(fixture.nativeElement.textContent).toContain('Acesso restrito');
    expect(fixture.nativeElement.textContent).toContain(
      'Você não tem permissão para visualizar usuários.',
    );
    expect(toastStore.toasts()[0]?.title).toBe(
      'Você não tem permissão para visualizar usuários.',
    );
  });

  it('should load the next page', () => {
    userService.list.mockReturnValueOnce(of(pageResponse(users, 0, 2)));
    sessionStore.setUser(admin);

    createPage();
    findButton(fixture.nativeElement, 'Próxima')?.click();
    fixture.detectChanges();

    expect(userService.list).toHaveBeenLastCalledWith({
      page: 1,
      size: 10,
      sort: 'name',
      direction: 'ASC',
    });
  });

  it('should load the previous page', () => {
    userService.list.mockReturnValueOnce(of(pageResponse(users, 1, 2)));
    sessionStore.setUser(admin);

    createPage();
    findButton(fixture.nativeElement, 'Anterior')?.click();
    fixture.detectChanges();

    expect(userService.list).toHaveBeenLastCalledWith({
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ASC',
    });
  });

  it('should open and close the create drawer', () => {
    sessionStore.setUser(admin);
    createPage();
    openCreateDrawer();

    expect(fixture.nativeElement.querySelector('gd-drawer [role="dialog"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Preencha os dados de acesso');

    findButton(fixture.nativeElement, 'Cancelar')?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('gd-drawer [role="dialog"]')).toBeFalsy();
  });

  it('should not call create for an invalid form', () => {
    sessionStore.setUser(admin);
    createPage();
    openCreateDrawer();

    submitUserForm();

    expect(userService.create).not.toHaveBeenCalled();
  });

  it('should create a user, close the drawer and reload the current page', () => {
    userService.list.mockReturnValueOnce(of(pageResponse(users, 1, 2)));
    sessionStore.setUser(admin);
    createPage();
    openCreateDrawer();
    fillValidForm();

    submitUserForm();

    expect(userService.create).toHaveBeenCalledWith({
      name: 'Maria Nova',
      email: 'maria.nova@example.com',
      password: 'password123',
      document: null,
      userType: 'USER',
    });
    expect(userService.list).toHaveBeenLastCalledWith({
      page: 1,
      size: 10,
      sort: 'name',
      direction: 'ASC',
    });
    expect(fixture.nativeElement.querySelector('gd-drawer [role="dialog"]')).toBeFalsy();
    expect(toastStore.toasts()[0]?.title).toBe('Usuário criado com sucesso.');
  });

  it.each([
    [400, 'Verifique os dados informados.'],
    [403, 'Você não tem permissão para criar este tipo de usuário.'],
  ])('should keep the drawer open and show feedback on error %s', (status, message) => {
    userService.create.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status })),
    );
    sessionStore.setUser(admin);
    createPage();
    openCreateDrawer();
    fillValidForm();

    submitUserForm();

    expect(fixture.nativeElement.querySelector('gd-drawer [role="dialog"]')).toBeTruthy();
    expect(toastStore.toasts()[0]?.title).toBe(message);
    expect(getUserInput(2).value).toBe('');
    expect(getUserInput(0).value).toBe('Maria Nova');
  });


  it('should allow a producer with farm user permission to create only regular users without listing', () => {
    sessionStore.setUser(producer);
    selectedFarmStore.setFarms([farm]);
    farmAccessStore.setAccess(producerAccess);

    createPage();

    expect(userService.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Criação de usuários disponível');

    openCreateDrawer();
    fillProducerForm();
    submitUserForm();

    expect(userService.create).toHaveBeenCalledWith({
      name: 'Maria Nova',
      email: 'maria.nova@example.com',
      password: 'password123',
      document: null,
      userType: 'USER',
    });
    expect(userService.list).not.toHaveBeenCalled();
    expect(toastStore.toasts()[0]?.title).toBe('Usuário criado com sucesso.');
  });

  it('should show protected access instead of actions for the authenticated user', () => {
    sessionStore.setUser(admin);

    createPage();

    const root = fixture.nativeElement as HTMLElement;
    const ownCard = Array.from(root.querySelectorAll<HTMLElement>('article')).find((card) => card.textContent?.includes('Maria Silva'));

    expect(ownCard?.textContent).toContain('Sua conta — acesso protegido');
    expect(findButton(ownCard as HTMLElement, 'Bloquear')).toBeUndefined();
    expect(findButton(ownCard as HTMLElement, 'Inativar')).toBeUndefined();
    expect(findButton(ownCard as HTMLElement, 'Tornar usuário')).toBeUndefined();
  });

  it('should open the activation confirmation with the expected content', () => {
    sessionStore.setUser(admin);
    createPage();

    findButton(fixture.nativeElement, 'Ativar')?.click();
    fixture.detectChanges();

    const dialog = getConfirmDialog();
    expect(dialog?.textContent).toContain('Ativar usuário');
    expect(dialog?.textContent).toContain('João Souza voltará a ter acesso ao sistema.');
  });

  it('should update status and reload the current page', () => {
    userService.list.mockReturnValueOnce(of(pageResponse(users, 1, 2)));
    sessionStore.setUser(admin);
    createPage();

    findButton(fixture.nativeElement, 'Ativar')?.click();
    fixture.detectChanges();
    findButton(getConfirmDialog() as HTMLElement, 'Ativar')?.click();
    fixture.detectChanges();

    expect(userService.updateStatus).toHaveBeenCalledWith(2, { status: 'ACTIVE' });
    expect(userService.list).toHaveBeenLastCalledWith({
      page: 1,
      size: 10,
      sort: 'name',
      direction: 'ASC',
    });
    expect(toastStore.toasts()[0]?.title).toBe('Status do usuário atualizado.');
    expect(getConfirmDialog()).toBeNull();
  });

  it('should update the user type', () => {
    sessionStore.setUser(admin);
    createPage();

    findButton(fixture.nativeElement, 'Tornar administrador')?.click();
    fixture.detectChanges();

    const dialog = getConfirmDialog();
    expect(dialog?.textContent).toContain('Tornar administrador');
    expect(dialog?.textContent).toContain('João Souza terá acesso administrativo ao sistema.');

    findButton(dialog as HTMLElement, 'Tornar administrador')?.click();
    fixture.detectChanges();

    expect(userService.updateType).toHaveBeenCalledWith(2, { userType: 'ADMIN' });
    expect(toastStore.toasts()[0]?.title).toBe('Tipo do usuário atualizado.');
  });

  it('should show permission feedback when a status update is forbidden', () => {
    userService.updateStatus.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    sessionStore.setUser(admin);
    createPage();

    findButton(fixture.nativeElement, 'Ativar')?.click();
    fixture.detectChanges();
    findButton(getConfirmDialog() as HTMLElement, 'Ativar')?.click();
    fixture.detectChanges();

    expect(toastStore.toasts()[0]?.title).toBe(
      'Você não tem permissão para realizar esta ação.',
    );
    expect(getConfirmDialog()).toBeTruthy();
  });

  it('should revalidate protection before changing the authenticated user', () => {
    sessionStore.setUser(admin);
    createPage();

    findButton(fixture.nativeElement, 'Ativar')?.click();
    fixture.detectChanges();
    sessionStore.setUser({ ...admin, id: 2 });
    findButton(getConfirmDialog() as HTMLElement, 'Ativar')?.click();
    fixture.detectChanges();

    expect(userService.updateStatus).not.toHaveBeenCalled();
    expect(toastStore.toasts()[0]?.title).toBe('Você não pode alterar seu próprio acesso.');
  });

  function getConfirmDialog(): HTMLElement | null {
    return fixture.nativeElement.querySelector('gd-confirm-dialog [role="dialog"]');
  }

  function openCreateDrawer(): void {
    findButton(fixture.nativeElement, 'Novo usuário')?.click();
    fixture.detectChanges();
  }

  function fillValidForm(): void {
    setUserInput(0, 'Maria Nova');
    setUserInput(1, 'maria.nova@example.com');
    setUserInput(2, 'password123');
    setUserSelect('USER');
  }

  function getUserInput(index: number): HTMLInputElement {
    const root = fixture.nativeElement as HTMLElement;
    return root.querySelectorAll<HTMLInputElement>('gd-user-form gd-input input')[
      index
    ];
  }

  function setUserInput(index: number, value: string): void {
    const input = getUserInput(index);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function setUserSelect(value: string): void {
    const select = fixture.nativeElement.querySelector(
      'gd-user-form gd-select select',
    ) as HTMLSelectElement;
    const option = Array.from(select.options).find((item) => item.textContent?.trim() === (value === 'ADMIN' ? 'Administrador' : 'Usuário'));

    if (!option) {
      throw new Error(`Option not found: ${value}`);
    }

    select.value = option.value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function fillProducerForm(): void {
    setUserInput(0, 'Maria Nova');
    setUserInput(1, 'maria.nova@example.com');
    setUserInput(2, 'password123');
  }

  function submitUserForm(): void {
    const form = fixture.nativeElement.querySelector('gd-user-form form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }
});

function findButton(root: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  );
}
