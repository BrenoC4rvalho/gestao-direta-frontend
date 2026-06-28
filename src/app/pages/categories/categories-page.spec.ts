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

    expect(categoryService.listByFarm).toHaveBeenCalledWith(1);
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

  it('should show global category actions only for admin', () => {
    createPage();
    const adminGlobalItem = findCategoryItem(fixture.nativeElement, 'Venda de safra');

    expect(adminGlobalItem).toBeTruthy();
    expect(findButton(adminGlobalItem, 'Editar')).toBeTruthy();
    expect(findButton(adminGlobalItem, 'Inativar')).toBeTruthy();

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

  it('should show farm category actions for admin and canManageCategories', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();
    const adminFarmItem = findCategoryItem(fixture.nativeElement, 'Adubo');

    expect(adminFarmItem).toBeTruthy();
    expect(findButton(adminFarmItem, 'Editar')).toBeTruthy();
    expect(findButton(adminFarmItem, 'Inativar')).toBeTruthy();

    sessionStore.setUser(user);
    farmAccessStore.setAccess(access);
    createPage();
    const userFarmItem = findCategoryItem(fixture.nativeElement, 'Adubo');

    expect(userFarmItem).toBeTruthy();
    expect(findButton(userFarmItem, 'Editar')).toBeTruthy();
    expect(findButton(userFarmItem, 'Inativar')).toBeTruthy();
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

  it('should inactivate a category and reload lists', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();
    clickButton('Inativar');

    const dialog = fixture.nativeElement.querySelector(
      'gd-confirm-dialog [role="dialog"]',
    ) as HTMLElement;
    findButton(dialog, 'Inativar')?.click();
    fixture.detectChanges();

    expect(categoryService.delete).toHaveBeenCalledWith(1);
    expect(categoryService.listByFarm).toHaveBeenCalledTimes(2);
    expect(toastStore.toasts()[0]?.title).toBe('Categoria inativada com sucesso.');
  });

  it('should show activate only for inactive categories', () => {
    selectedFarmStore.setFarms([farm]);
    categoryService.listByFarm.mockReturnValue(of([inactiveFarmCategory]));
    createPage();
    expect(findButton(fixture.nativeElement, 'Ativar')).toBeTruthy();

    categoryService.listByFarm.mockReturnValue(of([farmCategory]));
    createPage();
    expect(findButton(fixture.nativeElement, 'Ativar')).toBeUndefined();
  });

  it('should open activation confirmation for an inactive category', () => {
    selectedFarmStore.setFarms([farm]);
    categoryService.listByFarm.mockReturnValue(of([inactiveFarmCategory]));
    createPage();
    clickButton('Ativar');

    const dialog = fixture.nativeElement.querySelector(
      'gd-confirm-dialog [role="dialog"]',
    ) as HTMLElement;

    expect(dialog.textContent).toContain('Ativar categoria');
    expect(dialog.textContent).toContain(
      'Esta categoria voltará a ficar disponível para uso em movimentações financeiras.',
    );
    expect(findButton(dialog, 'Ativar')).toBeTruthy();
  });

  it('should not activate a category when confirmation is cancelled', () => {
    selectedFarmStore.setFarms([farm]);
    categoryService.listByFarm.mockReturnValue(of([inactiveFarmCategory]));
    createPage();
    clickButton('Ativar');

    const dialog = fixture.nativeElement.querySelector(
      'gd-confirm-dialog [role="dialog"]',
    ) as HTMLElement;
    findButton(dialog, 'Cancelar')?.click();
    fixture.detectChanges();

    expect(categoryService.activate).not.toHaveBeenCalled();
    expect(categoryService.update).not.toHaveBeenCalled();
    expect(
      fixture.nativeElement.querySelector('gd-confirm-dialog [role="dialog"]'),
    ).toBeNull();
  });

  it('should activate a category and reload lists', () => {
    selectedFarmStore.setFarms([farm]);
    categoryService.listByFarm.mockReturnValue(of([inactiveFarmCategory]));
    categoryService.activate.mockReturnValueOnce(
      of({ ...inactiveFarmCategory, status: 'ACTIVE' }),
    );
    createPage();
    clickButton('Ativar');

    const dialog = fixture.nativeElement.querySelector(
      'gd-confirm-dialog [role="dialog"]',
    ) as HTMLElement;
    findButton(dialog, 'Ativar')?.click();
    fixture.detectChanges();

    expect(categoryService.activate).toHaveBeenCalledWith(3);
    expect(categoryService.update).not.toHaveBeenCalled();
    expect(categoryService.listByFarm).toHaveBeenCalledTimes(2);
    expect(toastStore.toasts()[0]?.title).toBe('Categoria ativada com sucesso.');
  });

  it('should show specific toast when activation fails', () => {
    selectedFarmStore.setFarms([farm]);
    categoryService.listByFarm.mockReturnValue(of([inactiveFarmCategory]));
    categoryService.activate.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 400 })),
    );
    createPage();
    clickButton('Ativar');

    const dialog = fixture.nativeElement.querySelector(
      'gd-confirm-dialog [role="dialog"]',
    ) as HTMLElement;
    findButton(dialog, 'Ativar')?.click();
    fixture.detectChanges();

    expect(categoryService.activate).toHaveBeenCalledOnce();
    expect(categoryService.update).not.toHaveBeenCalled();
    expect(toastStore.toasts()[0]?.title).toBe(
      'Não foi possível ativar a categoria.',
    );
  });

  it('should activate without sending global type payload', () => {
    selectedFarmStore.setFarms([farm]);
    categoryService.listByFarm.mockReturnValue(of([inactiveGlobalTypeCategory]));
    createPage();
    clickButton('Ativar');

    const dialog = fixture.nativeElement.querySelector(
      'gd-confirm-dialog [role="dialog"]',
    ) as HTMLElement;
    findButton(dialog, 'Ativar')?.click();
    fixture.detectChanges();

    expect(categoryService.activate).toHaveBeenCalledWith(5);
    expect(categoryService.update).not.toHaveBeenCalled();
    expect(toastStore.toasts()[0]?.title).toBe('Categoria ativada com sucesso.');
  });

  it('should show inactive global category activation only for admin', () => {
    categoryService.listGlobal.mockReturnValue(of([inactiveGlobalCategory]));
    createPage();
    const adminGlobalItem = findCategoryItem(fixture.nativeElement, 'Serviços globais');

    expect(findButton(adminGlobalItem, 'Ativar')).toBeTruthy();

    sessionStore.setUser(user);
    selectedFarmStore.setFarms([farm]);
    farmAccessStore.setAccess(access);
    categoryService.listByFarm.mockReturnValue(of([inactiveGlobalCategory]));
    createPage();
    const userGlobalItem = findCategoryItem(fixture.nativeElement, 'Serviços globais');

    expect(findButton(userGlobalItem, 'Ativar')).toBeUndefined();
  });

  it('should show inactive farm category activation only with manage permission', () => {
    sessionStore.setUser(user);
    selectedFarmStore.setFarms([farm]);
    farmAccessStore.setAccess(access);
    categoryService.listByFarm.mockReturnValue(of([inactiveFarmCategory]));
    createPage();
    let farmItem = findCategoryItem(fixture.nativeElement, 'Defensivos');

    expect(findButton(farmItem, 'Ativar')).toBeTruthy();

    farmAccessStore.setAccess({
      ...access,
      permissions: { ...access.permissions, canManageCategories: false },
    });
    createPage();
    farmItem = findCategoryItem(fixture.nativeElement, 'Defensivos');

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
