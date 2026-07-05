import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { AuthUser } from '../../core/models/auth.models';
import { FarmAccessResponse } from '../../core/models/farm-access.models';
import { Farm } from '../../core/models/farm.models';
import {
  FinancialCategory,
  UpdateFinancialCategoryRequest,
} from '../../core/models/financial-category.models';
import { FinancialCategoryService } from '../../core/services/financial-category.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';

import { CategoriesPage } from './categories-page';

const drawerAnimationDurationMs = 250;
const confirmAnimationDurationMs = 200;

interface CategoriesPageHarness {
  saveCategory(payload: UpdateFinancialCategoryRequest): void;
  openEditDrawer(category: FinancialCategory): void;
  requestDelete(category: FinancialCategory): void;
  requestActivate(category: FinancialCategory): void;
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
  name: 'Produtor',
  email: 'produtor@example.com',
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

const access: FarmAccessResponse = {
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  userId: 2,
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

const farmCategory: FinancialCategory = {
  id: 1,
  name: 'Adubo',
  type: 'EXPENSE',
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  isDefault: false,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const globalCategory: FinancialCategory = {
  id: 2,
  name: 'Venda de safra',
  type: 'INCOME',
  farmId: null,
  farmName: null,
  isDefault: true,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const inactiveFarmCategory: FinancialCategory = {
  ...farmCategory,
  id: 3,
  name: 'Defensivos',
  color: '#15803D',
  icon: 'sprout',
  status: 'INACTIVE',
};

const inactiveGlobalCategory: FinancialCategory = {
  ...globalCategory,
  id: 4,
  name: 'Serviços globais',
  color: '#2563EB',
  icon: 'tags',
  status: 'INACTIVE',
};

const inactiveGlobalTypeCategory: FinancialCategory = {
  ...inactiveFarmCategory,
  id: 5,
  name: 'Tipo global legado',
  type: 'GLOBAL',
};

describe('CategoriesPage', () => {
  let fixture: ComponentFixture<CategoriesPage>;
  let categoryService: {
    listByFarm: ReturnType<typeof vi.fn>;
    listGlobal: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    activate: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let selectedFarmStore: SelectedFarmStore;
  let farmAccessStore: FarmAccessStore;
  let sessionStore: SessionStore;
  let toastStore: ToastStore;

  beforeEach(async () => {
    categoryService = {
      listByFarm: vi.fn().mockReturnValue(of([farmCategory])),
      listGlobal: vi.fn().mockReturnValue(of([globalCategory])),
      getById: vi.fn().mockReturnValue(of(farmCategory)),
      create: vi.fn().mockReturnValue(of({ ...farmCategory, id: 3 })),
      update: vi.fn().mockReturnValue(of({ ...farmCategory, name: 'Adubo e insumos' })),
      activate: vi.fn().mockReturnValue(of({ ...inactiveFarmCategory, status: 'ACTIVE' })),
      delete: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [CategoriesPage],
      providers: [
        provideGestaoDiretaIcons(),
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
    fixture = TestBed.createComponent(CategoriesPage);
    fixture.detectChanges();
  }

  it('should load and render global categories', () => {
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Venda de safra');
    expect(categoryService.listGlobal).toHaveBeenCalled();
  });

  it('should load farm categories when a farm is selected', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    expect(categoryService.listByFarm).toHaveBeenCalledWith(1, { includeInactive: true });
    expect(fixture.nativeElement.textContent).toContain('Adubo');
  });

  it('should render farm and global categories with category list items', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    const lists = fixture.nativeElement.querySelectorAll('[role="list"]');
    const listItems = fixture.nativeElement.querySelectorAll(
      'gd-category-card[role="listitem"] article',
    );

    expect(lists.length).toBe(2);
    expect(listItems.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Adubo');
    expect(fixture.nativeElement.textContent).toContain('Venda de safra');
  });

  it('should render active and inactive farm categories without direct status actions', () => {
    selectedFarmStore.setFarms([farm]);
    categoryService.listByFarm.mockReturnValue(of([farmCategory, inactiveFarmCategory]));
    createPage();

    const activeItem = findCategoryItem(fixture.nativeElement, 'Adubo');
    const inactiveItem = findCategoryItem(fixture.nativeElement, 'Defensivos');

    expect(activeItem.textContent).toContain('Ativa');
    expect(inactiveItem.textContent).toContain('Inativa');
    expect(findButton(activeItem, 'Editar')).toBeTruthy();
    expect(findButton(inactiveItem, 'Editar')).toBeTruthy();
    expect(findButton(activeItem, 'Inativar')).toBeUndefined();
    expect(findButton(inactiveItem, 'Ativar')).toBeUndefined();
  });

  it('should not load farm categories when no farm is selected', () => {
    createPage();

    expect(categoryService.listByFarm).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'Selecione uma fazenda para visualizar categorias específicas da fazenda.',
    );
  });

  it('should show access denied without view permission', () => {
    sessionStore.setUser(user);
    selectedFarmStore.setFarms([farm]);
    farmAccessStore.setAccess({
      ...access,
      permissions: {
        ...access.permissions,
        canViewFinancial: false,
        canManageCategories: false,
      },
    });
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Acesso restrito');
    expect(categoryService.listByFarm).not.toHaveBeenCalled();
  });

  it('should show create button with permission and hide it without permission', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();
    expect(findButton(fixture.nativeElement, 'Nova categoria')).toBeTruthy();

    sessionStore.setUser(user);
    farmAccessStore.setAccess({
      ...access,
      permissions: { ...access.permissions, canManageCategories: false },
    });
    createPage();
    expect(findButton(fixture.nativeElement, 'Nova categoria')).toBeUndefined();
  });

  it('should show create button for admin without selected farm', () => {
    createPage();

    expect(findButton(fixture.nativeElement, 'Nova categoria')).toBeTruthy();
  });

  it('should show scope field for admin when creating', () => {
    createPage();
    clickButton('Nova categoria');

    expect(fixture.nativeElement.textContent).toContain('Escopo da categoria');
  });

  it('should not show category status section when creating', () => {
    createPage();
    clickButton('Nova categoria');

    const drawer = getDialog('gd-drawer') as HTMLElement;

    expect(drawer.textContent).not.toContain('Status da categoria');
    expect(findButton(drawer, 'Inativar')).toBeUndefined();
    expect(findButton(drawer, 'Ativar')).toBeUndefined();
  });

  it('should create a global category without selected farm and reload globals', () => {
    createPage();
    clickButton('Nova categoria');
    setInput('Serviços globais');
    setSelect('INCOME');
    setScope('GLOBAL');
    submitForm();

    expect(categoryService.create).toHaveBeenCalledWith({
      name: 'Serviços globais',
      type: 'INCOME',
      farmId: null,
      isDefault: true,
    });
    expect(categoryService.create.mock.calls[0][0].type).not.toBe('GLOBAL');
    expect(categoryService.listGlobal).toHaveBeenCalledTimes(2);
    expect(toastStore.toasts()[0]?.title).toBe('Categoria global criada com sucesso.');
  });

  it('should create an admin farm category with selected farm scope', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();
    clickButton('Nova categoria');
    setInput('Adubo novo');
    setSelect('EXPENSE');
    setScope('FARM');
    submitForm();

    expect(categoryService.create).toHaveBeenCalledWith({
      name: 'Adubo novo',
      type: 'EXPENSE',
      farmId: 1,
      isDefault: false,
    });
  });

  it('should let producer create only farm categories without scope field', () => {
    sessionStore.setUser(user);
    selectedFarmStore.setFarms([farm]);
    farmAccessStore.setAccess(access);
    createPage();
    clickButton('Nova categoria');

    expect(fixture.nativeElement.textContent).not.toContain('Escopo da categoria');

    setInput('Venda local');
    setSelect('INCOME');
    submitForm();

    expect(categoryService.create).toHaveBeenCalledWith({
      name: 'Venda local',
      type: 'INCOME',
      farmId: 1,
      isDefault: false,
    });
  });

  it('should not create a farm category for non admin without selected farm', () => {
    sessionStore.setUser(user);
    createPage();

    expect(findButton(fixture.nativeElement, 'Nova categoria')).toBeUndefined();

    const harness = fixture.componentInstance as unknown as CategoriesPageHarness;
    harness.saveCategory({ name: 'Adubo', type: 'EXPENSE' });
    fixture.detectChanges();

    expect(categoryService.create).not.toHaveBeenCalled();
  });

  it('should create a farm category and reload lists', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();
    clickButton('Nova categoria');
    setInput('Adubo novo');
    setSelect('EXPENSE');
    submitForm();

    expect(categoryService.create).toHaveBeenCalledWith({
      name: 'Adubo novo',
      type: 'EXPENSE',
      farmId: 1,
      isDefault: false,
    });
    expect(categoryService.listByFarm).toHaveBeenCalledTimes(2);
    expect(categoryService.listByFarm).toHaveBeenLastCalledWith(1, { includeInactive: true });
    expect(toastStore.toasts()[0]?.title).toBe('Categoria criada com sucesso.');
  });

  it('should not create a category with global type payload', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    const harness = fixture.componentInstance as unknown as CategoriesPageHarness;
    harness.saveCategory({ name: 'Global indevida', type: 'GLOBAL' });
    fixture.detectChanges();

    expect(categoryService.create).not.toHaveBeenCalled();
  });

  it('should update a farm category and reload lists', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();
    clickButton('Editar');
    setInput('Adubo e insumos');
    submitForm();

    expect(categoryService.update).toHaveBeenCalledWith(1, {
      name: 'Adubo e insumos',
      type: 'EXPENSE',
      farmId: 1,
      isDefault: false,
    });
    expect(toastStore.toasts()[0]?.title).toBe('Categoria atualizada com sucesso.');
  });

  it('should not update a category with global type payload', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    const harness = fixture.componentInstance as unknown as CategoriesPageHarness;
    harness.openEditDrawer(farmCategory);
    harness.saveCategory({ name: 'Adubo global indevido', type: 'GLOBAL' });
    fixture.detectChanges();

    expect(categoryService.activate).not.toHaveBeenCalled();
    expect(categoryService.update).not.toHaveBeenCalled();
  });

  it('should show global category edit only for admin and keep status action out of the list', () => {
    createPage();
    const adminGlobalItem = findCategoryItem(fixture.nativeElement, 'Venda de safra');

    expect(adminGlobalItem).toBeTruthy();
    expect(findButton(adminGlobalItem, 'Editar')).toBeTruthy();
    expect(findButton(adminGlobalItem, 'Inativar')).toBeUndefined();

    sessionStore.setUser(user);
    selectedFarmStore.setFarms([farm]);
    farmAccessStore.setAccess(access);
    categoryService.listByFarm.mockReturnValue(of([farmCategory, globalCategory]));
    createPage();
    const userGlobalItem = findCategoryItem(fixture.nativeElement, 'Venda de safra');

    expect(userGlobalItem).toBeTruthy();
    expect(findButton(userGlobalItem, 'Editar')).toBeUndefined();
    expect(findButton(userGlobalItem, 'Inativar')).toBeUndefined();
  });

  it('should block global category edit for non admin handlers', () => {
    sessionStore.setUser(user);
    selectedFarmStore.setFarms([farm]);
    farmAccessStore.setAccess(access);
    categoryService.listByFarm.mockReturnValue(of([farmCategory]));
    createPage();

    const harness = fixture.componentInstance as unknown as CategoriesPageHarness;
    harness.openEditDrawer(globalCategory);
    fixture.detectChanges();

    expect(categoryService.activate).not.toHaveBeenCalled();
    expect(categoryService.update).not.toHaveBeenCalled();
    expect(toastStore.toasts()[0]?.title).toBe(
      'Você não tem permissão para realizar esta ação.',
    );
  });

  it('should show farm category edit for admin and canManageCategories without direct status actions', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();
    const adminFarmItem = findCategoryItem(fixture.nativeElement, 'Adubo');

    expect(adminFarmItem).toBeTruthy();
    expect(findButton(adminFarmItem, 'Editar')).toBeTruthy();
    expect(findButton(adminFarmItem, 'Inativar')).toBeUndefined();

    sessionStore.setUser(user);
    farmAccessStore.setAccess(access);
    createPage();
    const userFarmItem = findCategoryItem(fixture.nativeElement, 'Adubo');

    expect(userFarmItem).toBeTruthy();
    expect(findButton(userFarmItem, 'Editar')).toBeTruthy();
    expect(findButton(userFarmItem, 'Inativar')).toBeUndefined();
  });

  it('should block global category inactivation for non admin handlers', () => {
    sessionStore.setUser(user);
    selectedFarmStore.setFarms([farm]);
    farmAccessStore.setAccess(access);
    categoryService.listByFarm.mockReturnValue(of([farmCategory, globalCategory]));
    createPage();

    const harness = fixture.componentInstance as unknown as CategoriesPageHarness;
    harness.requestDelete(globalCategory);
    fixture.detectChanges();

    expect(categoryService.delete).not.toHaveBeenCalled();
    expect(toastStore.toasts()[0]?.title).toBe(
      'Você não tem permissão para realizar esta ação.',
    );
  });

  it('should show active category status section in the edit drawer', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();
    clickButton('Editar');

    const drawer = getDialog('gd-drawer') as HTMLElement;
    expect(drawer.textContent).toContain('Status da categoria');
    expect(drawer.textContent).toContain('Ativa');
    expect(drawer.textContent).toContain(
      'Categorias ativas podem ser usadas em novas movimentações.',
    );
    const inactivateButton = findButton(drawer, 'Inativar');
    expect(inactivateButton).toBeTruthy();
    expect(inactivateButton?.className).toContain('bg-danger');
    expect(findButton(fixture.nativeElement, 'Ativar')).toBeUndefined();
  });

  it('should show inactive category status section in the edit drawer', () => {
    selectedFarmStore.setFarms([farm]);
    categoryService.listByFarm.mockReturnValue(of([inactiveFarmCategory]));
    createPage();
    clickButton('Editar');

    const drawer = getDialog('gd-drawer') as HTMLElement;
    expect(drawer.textContent).toContain('Status da categoria');
    expect(drawer.textContent).toContain('Inativa');
    expect(drawer.textContent).toContain(
      'Categorias inativas não devem ser usadas em novas movimentações.',
    );
    const activateButton = findButton(drawer, 'Ativar');
    expect(activateButton).toBeTruthy();
    expect(activateButton?.className).not.toContain('bg-danger');
    expect(findButton(drawer, 'Inativar')).toBeUndefined();
  });

  it('should open inactivation confirmation from the edit drawer', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();
    clickButton('Editar');
    findButton(getDialog('gd-drawer') as HTMLElement, 'Inativar')?.click();
    fixture.detectChanges();

    const dialog = getDialog('gd-confirm-dialog') as HTMLElement;
    expect(dialog.textContent).toContain('Inativar categoria?');
    expect(dialog.textContent).toContain(
      'Essa categoria deixará de estar disponível para novas movimentações. Movimentações antigas continuarão preservadas.',
    );
    const confirmButton = findButton(dialog, 'Inativar');
    expect(confirmButton).toBeTruthy();
    expect(confirmButton?.className).toContain('bg-danger');
  });

  it('should inactivate a category and reload lists', async () => {
    selectedFarmStore.setFarms([farm]);
    createPage();
    clickButton('Editar');
    findButton(getDialog('gd-drawer') as HTMLElement, 'Inativar')?.click();
    fixture.detectChanges();

    const dialog = getDialog('gd-confirm-dialog') as HTMLElement;
    findButton(dialog, 'Inativar')?.click();
    fixture.detectChanges();

    expect(categoryService.delete).toHaveBeenCalledWith(1);
    expect(categoryService.listByFarm).toHaveBeenCalledTimes(2);
    expect(categoryService.listByFarm).toHaveBeenLastCalledWith(1, { includeInactive: true });
    expect(toastStore.toasts()[0]?.title).toBe('Categoria inativada com sucesso.');
    await finishDrawerClose();
    expect(getDialog('gd-drawer')).toBeNull();
  });

  it('should keep activate out of the list and show it for inactive categories in the drawer', () => {
    selectedFarmStore.setFarms([farm]);
    categoryService.listByFarm.mockReturnValue(of([inactiveFarmCategory]));
    createPage();
    const inactiveItem = findCategoryItem(fixture.nativeElement, 'Defensivos');
    expect(findButton(inactiveItem, 'Ativar')).toBeUndefined();

    clickButton('Editar');
    expect(findButton(getDialog('gd-drawer') as HTMLElement, 'Ativar')).toBeTruthy();

    categoryService.listByFarm.mockReturnValue(of([farmCategory]));
    createPage();
    expect(findButton(fixture.nativeElement, 'Ativar')).toBeUndefined();
  });

  it('should open activation confirmation for an inactive category', () => {
    selectedFarmStore.setFarms([farm]);
    categoryService.listByFarm.mockReturnValue(of([inactiveFarmCategory]));
    createPage();
    clickButton('Editar');
    findButton(getDialog('gd-drawer') as HTMLElement, 'Ativar')?.click();
    fixture.detectChanges();

    const dialog = getDialog('gd-confirm-dialog') as HTMLElement;

    expect(dialog.textContent).toContain('Ativar categoria?');
    expect(dialog.textContent).toContain(
      'Essa categoria voltará a ficar disponível para novas movimentações.',
    );
    const confirmButton = findButton(dialog, 'Ativar');
    expect(confirmButton).toBeTruthy();
    expect(confirmButton?.className).not.toContain('bg-danger');
  });

  it('should not activate a category when confirmation is cancelled', async () => {
    selectedFarmStore.setFarms([farm]);
    categoryService.listByFarm.mockReturnValue(of([inactiveFarmCategory]));
    createPage();
    clickButton('Editar');
    findButton(getDialog('gd-drawer') as HTMLElement, 'Ativar')?.click();
    fixture.detectChanges();

    const dialog = getDialog('gd-confirm-dialog') as HTMLElement;
    findButton(dialog, 'Cancelar')?.click();
    fixture.detectChanges();
    await finishConfirmClose();

    expect(categoryService.activate).not.toHaveBeenCalled();
    expect(categoryService.update).not.toHaveBeenCalled();
    expect(getDialog('gd-confirm-dialog')).toBeNull();
  });

  it('should activate a category and reload lists', async () => {
    selectedFarmStore.setFarms([farm]);
    categoryService.listByFarm.mockReturnValue(of([inactiveFarmCategory]));
    categoryService.activate.mockReturnValueOnce(
      of({ ...inactiveFarmCategory, status: 'ACTIVE' }),
    );
    createPage();
    clickButton('Editar');
    findButton(getDialog('gd-drawer') as HTMLElement, 'Ativar')?.click();
    fixture.detectChanges();

    const dialog = getDialog('gd-confirm-dialog') as HTMLElement;
    findButton(dialog, 'Ativar')?.click();
    fixture.detectChanges();

    expect(categoryService.activate).toHaveBeenCalledWith(3);
    expect(categoryService.update).not.toHaveBeenCalled();
    expect(categoryService.listByFarm).toHaveBeenCalledTimes(2);
    expect(categoryService.listByFarm).toHaveBeenLastCalledWith(1, { includeInactive: true });
    expect(toastStore.toasts()[0]?.title).toBe('Categoria ativada com sucesso.');
    await finishDrawerClose();
    expect(getDialog('gd-drawer')).toBeNull();
  });

  it('should show specific toast when status change fails', () => {
    selectedFarmStore.setFarms([farm]);
    categoryService.listByFarm.mockReturnValue(of([inactiveFarmCategory]));
    categoryService.activate.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 400 })),
    );
    createPage();
    clickButton('Editar');
    findButton(getDialog('gd-drawer') as HTMLElement, 'Ativar')?.click();
    fixture.detectChanges();

    const dialog = getDialog('gd-confirm-dialog') as HTMLElement;
    findButton(dialog, 'Ativar')?.click();
    fixture.detectChanges();

    expect(categoryService.activate).toHaveBeenCalledOnce();
    expect(categoryService.update).not.toHaveBeenCalled();
    expect(toastStore.toasts()[0]?.title).toBe(
      'Não foi possível alterar o status da categoria.',
    );
  });

  it('should activate without sending global type payload', () => {
    selectedFarmStore.setFarms([farm]);
    categoryService.listByFarm.mockReturnValue(of([inactiveGlobalTypeCategory]));
    createPage();
    clickButton('Editar');
    findButton(getDialog('gd-drawer') as HTMLElement, 'Ativar')?.click();
    fixture.detectChanges();

    const dialog = getDialog('gd-confirm-dialog') as HTMLElement;
    findButton(dialog, 'Ativar')?.click();
    fixture.detectChanges();

    expect(categoryService.activate).toHaveBeenCalledWith(5);
    expect(categoryService.update).not.toHaveBeenCalled();
    expect(toastStore.toasts()[0]?.title).toBe('Categoria ativada com sucesso.');
  });

  it('should show inactive global category status action only for admin in the drawer', () => {
    categoryService.listGlobal.mockReturnValue(of([inactiveGlobalCategory]));
    createPage();
    const adminGlobalItem = findCategoryItem(fixture.nativeElement, 'Serviços globais');

    expect(findButton(adminGlobalItem, 'Ativar')).toBeUndefined();
    findButton(adminGlobalItem, 'Editar')?.click();
    fixture.detectChanges();
    expect(findButton(getDialog('gd-drawer') as HTMLElement, 'Ativar')).toBeTruthy();

    sessionStore.setUser(user);
    selectedFarmStore.setFarms([farm]);
    farmAccessStore.setAccess(access);
    categoryService.listByFarm.mockReturnValue(of([inactiveGlobalCategory]));
    createPage();
    const userGlobalItem = findCategoryItem(fixture.nativeElement, 'Serviços globais');

    expect(findButton(userGlobalItem, 'Editar')).toBeUndefined();
    expect(findButton(userGlobalItem, 'Ativar')).toBeUndefined();
  });

  it('should show inactive farm category status action only with manage permission in the drawer', () => {
    sessionStore.setUser(user);
    selectedFarmStore.setFarms([farm]);
    farmAccessStore.setAccess(access);
    categoryService.listByFarm.mockReturnValue(of([inactiveFarmCategory]));
    createPage();
    let farmItem = findCategoryItem(fixture.nativeElement, 'Defensivos');

    expect(findButton(farmItem, 'Ativar')).toBeUndefined();
    findButton(farmItem, 'Editar')?.click();
    fixture.detectChanges();
    expect(findButton(getDialog('gd-drawer') as HTMLElement, 'Ativar')).toBeTruthy();

    farmAccessStore.setAccess({
      ...access,
      permissions: { ...access.permissions, canManageCategories: false },
    });
    createPage();
    farmItem = findCategoryItem(fixture.nativeElement, 'Defensivos');

    expect(findButton(farmItem, 'Editar')).toBeUndefined();
    expect(findButton(farmItem, 'Ativar')).toBeUndefined();
  });

  it('should block global category activation for non admin handlers', () => {
    sessionStore.setUser(user);
    selectedFarmStore.setFarms([farm]);
    farmAccessStore.setAccess(access);
    categoryService.listByFarm.mockReturnValue(of([inactiveFarmCategory]));
    createPage();

    const harness = fixture.componentInstance as unknown as CategoriesPageHarness;
    harness.requestActivate(inactiveGlobalCategory);
    fixture.detectChanges();

    expect(categoryService.activate).not.toHaveBeenCalled();
    expect(categoryService.update).not.toHaveBeenCalled();
    expect(toastStore.toasts()[0]?.title).toBe(
      'Você não tem permissão para realizar esta ação.',
    );
  });

  it('should show permission toast on 403', () => {
    categoryService.create.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    selectedFarmStore.setFarms([farm]);
    createPage();
    clickButton('Nova categoria');
    setInput('Adubo novo');
    setSelect('EXPENSE');
    submitForm();

    expect(toastStore.toasts()[0]?.title).toBe(
      'Você não tem permissão para realizar esta ação.',
    );
  });

  function clickButton(label: string): void {
    findButton(fixture.nativeElement, label)?.click();
    fixture.detectChanges();
  }

  function setInput(value: string): void {
    const input = fixture.nativeElement.querySelector(
      'gd-category-form gd-input input',
    ) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function setSelect(value: string): void {
    const select = fixture.nativeElement.querySelector(
      'gd-category-form gd-select select',
    ) as HTMLSelectElement;
    setSelectValue(select, value);
  }

  function setScope(value: string): void {
    const select = fixture.nativeElement.querySelectorAll(
      'gd-category-form gd-select select',
    ).item(1) as HTMLSelectElement;
    setSelectValue(select, value);
  }

  function setSelectValue(select: HTMLSelectElement, value: string): void {
    const option = Array.from(select.options).find((item) => item.value.includes(value));
    select.selectedIndex = option?.index ?? 0;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function submitForm(): void {
    const form = fixture.nativeElement.querySelector(
      'gd-category-form form',
    ) as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function getDialog(selector: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`${selector} [role="dialog"]`);
  }

  async function finishConfirmClose(): Promise<void> {
    await wait(confirmAnimationDurationMs + 10);
    fixture.detectChanges();
  }

  async function finishDrawerClose(): Promise<void> {
    await wait(drawerAnimationDurationMs + 10);
    fixture.detectChanges();
  }
});

function findCategoryItem(root: HTMLElement, label: string): HTMLElement {
  const item = Array.from(root.querySelectorAll('gd-category-card article')).find((article) =>
    article.textContent?.includes(label),
  );

  if (!item) {
    throw new Error(`Category item not found: ${label}`);
  }

  return item as HTMLElement;
}
function findButton(root: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  );
}


function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
