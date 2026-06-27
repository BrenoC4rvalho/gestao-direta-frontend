import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { AuthUser } from '../../core/models/auth.models';
import { FarmAccessResponse } from '../../core/models/farm-access.models';
import { Farm } from '../../core/models/farm.models';
import { FinancialCategory } from '../../core/models/financial-category.models';
import { FinancialCategoryService } from '../../core/services/financial-category.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';

import { CategoriesPage } from './categories-page';

interface CategoriesPageHarness {
  openEditDrawer(category: FinancialCategory): void;
  requestDelete(category: FinancialCategory): void;
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

describe('CategoriesPage', () => {
  let fixture: ComponentFixture<CategoriesPage>;
  let categoryService: {
    listByFarm: ReturnType<typeof vi.fn>;
    listGlobal: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
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

  it('should render title and load global categories', () => {
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Categorias financeiras');
    expect(fixture.nativeElement.textContent).toContain('Venda de safra');
    expect(categoryService.listGlobal).toHaveBeenCalled();
  });

  it('should load farm categories when a farm is selected', () => {
    selectedFarmStore.setFarms([farm]);
    createPage();

    expect(categoryService.listByFarm).toHaveBeenCalledWith(1);
    expect(fixture.nativeElement.textContent).toContain('Adubo');
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

  it('should allow global category edit only for admin', () => {
    createPage();
    expect(findButtons(fixture.nativeElement, 'Editar').length).toBeGreaterThan(0);

    sessionStore.setUser(user);
    selectedFarmStore.setFarms([farm]);
    farmAccessStore.setAccess(access);
    categoryService.listByFarm.mockReturnValue(of([farmCategory, globalCategory]));
    createPage();

    const harness = fixture.componentInstance as unknown as CategoriesPageHarness;
    harness.openEditDrawer(globalCategory);
    fixture.detectChanges();

    expect(categoryService.update).not.toHaveBeenCalled();
    expect(toastStore.toasts()[0]?.title).toBe(
      'Você não tem permissão para realizar esta ação.',
    );
  });

  it('should allow farm category inactivation for canManageCategories', () => {
    sessionStore.setUser(user);
    selectedFarmStore.setFarms([farm]);
    farmAccessStore.setAccess(access);
    categoryService.listByFarm.mockReturnValue(of([farmCategory, globalCategory]));
    createPage();

    expect(findButton(fixture.nativeElement, 'Inativar')).toBeTruthy();
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

function findButtons(root: HTMLElement, label: string): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll('button')).filter(
    (button) => button.textContent?.trim() === label,
  );
}

function findButton(root: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  );
}
