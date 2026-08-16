import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

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
  openCreateDrawer(): void;
  saveCategory(payload: { name: string; type: 'INCOME' | 'EXPENSE' }): void;
  openEditDrawer(category: FinancialCategory): void;
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
  name: 'Usuário',
  email: 'user@example.com',
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

const category: FinancialCategory = {
  id: 1,
  name: 'Adubo',
  type: 'EXPENSE',
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const producerAccess: FarmAccessResponse = {
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

describe('CategoriesPage', () => {
  let fixture: ComponentFixture<CategoriesPage>;
  let categoryService: {
    listByFarm: ReturnType<typeof vi.fn>;
    listPageByFarm: ReturnType<typeof vi.fn>;
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
      listPageByFarm: vi
        .fn()
        .mockReturnValue(
          of({
            content: [category],
            page: 0,
            size: 20,
            totalElements: 1,
            totalPages: 1,
            first: true,
            last: true,
          }),
        ),
      listByFarm: vi.fn().mockReturnValue(of([category])),
      getById: vi.fn().mockReturnValue(of(category)),
      create: vi.fn().mockReturnValue(of({ ...category, id: 2 })),
      update: vi.fn().mockReturnValue(of({ ...category, name: 'Adubo e insumos' })),
      activate: vi.fn().mockReturnValue(of({ ...category, status: 'ACTIVE' })),
      delete: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [CategoriesPage],
      providers: [
        provideGestaoDiretaIcons(),
        provideRouter([]),
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
    toastStore.clear();
    sessionStore.setUser(admin);
  });

  afterEach(() => {
    selectedFarmStore.clear();
    farmAccessStore.clear();
    sessionStore.clear();
    toastStore.clear();
  });

  it('should not load categories without selected farm', () => {
    createPage();

    expect(categoryService.listPageByFarm).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'Selecione uma fazenda para visualizar as categorias.',
    );
  });

  it('should load categories for selected farm with inactive categories included', () => {
    selectFarm(farm);
    createPage();

    expect(categoryService.listPageByFarm).toHaveBeenCalledWith(1, {
      includeInactive: true,
      search: null,
      status: null,
      page: 0,
      size: 20,
      sort: 'name',
      direction: 'ASC',
    });
    expect(fixture.nativeElement.textContent).toContain('Adubo');
    expect(fixture.nativeElement.textContent).not.toContain('Categorias globais');
  });

  it('should create category with selected farmId', () => {
    selectFarm(farm);
    createPage();
    vi.clearAllMocks();

    harness().saveCategory({ name: 'Venda de leite', type: 'INCOME' });

    expect(categoryService.create).toHaveBeenCalledWith({
      name: 'Venda de leite',
      type: 'INCOME',
      farmId: 1,
    });
  });

  it('should block create and show feedback without selected farm', () => {
    createPage();

    harness().openCreateDrawer();

    expect(categoryService.create).not.toHaveBeenCalled();
    expect(toastStore.toasts().at(-1)?.title).toBe('Selecione uma fazenda para criar categorias.');
  });

  it('should update category without farmId', () => {
    selectFarm(farm);
    createPage();

    harness().openEditDrawer(category);
    harness().saveCategory({ name: 'Adubo e insumos', type: 'EXPENSE' });

    expect(categoryService.update).toHaveBeenCalledWith(1, {
      name: 'Adubo e insumos',
      type: 'EXPENSE',
    });
    expect(categoryService.update.mock.calls[0][1]).not.toHaveProperty('farmId');
  });

  it('should clear state and reload categories when selected farm changes', () => {
    selectedFarmStore.setFarms([farm, secondFarm]);
    createPage();
    vi.clearAllMocks();

    selectedFarmStore.selectFarm(secondFarm);
    fixture.detectChanges();

    expect(categoryService.listPageByFarm).toHaveBeenCalledWith(2, {
      includeInactive: true,
      search: null,
      status: null,
      page: 0,
      size: 20,
      sort: 'name',
      direction: 'ASC',
    });
  });

  it('should let producer manage farm categories', () => {
    sessionStore.setUser(user);
    selectFarm(farm);
    farmAccessStore.setAccess(producerAccess);
    createPage();

    expect(findButton('Nova categoria')).toBeTruthy();
    expect(findButton('Editar categoria')).toBeTruthy();
  });

  it('should let accountant view without management actions', () => {
    sessionStore.setUser(user);
    selectFarm(farm);
    farmAccessStore.setAccess({
      ...producerAccess,
      role: 'ACCOUNTANT',
      permissions: {
        ...producerAccess.permissions,
        canManageCategories: false,
        canManageTransactions: false,
      },
    });
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Adubo');
    expect(findButton('Nova categoria')).toBeUndefined();
    expect(findButton('Editar categoria')).toBeUndefined();
  });

  function createPage(): void {
    fixture = TestBed.createComponent(CategoriesPage);
    fixture.detectChanges();
  }

  function selectFarm(selectedFarm: Farm): void {
    selectedFarmStore.setFarms([selectedFarm]);
    selectedFarmStore.selectFarm(selectedFarm);
  }

  function harness(): CategoriesPageHarness {
    return fixture.componentInstance as unknown as CategoriesPageHarness;
  }

  function findButton(label: string): HTMLButtonElement | undefined {
    const buttons = fixture.nativeElement.querySelectorAll(
      'button',
    ) as NodeListOf<HTMLButtonElement>;
    return Array.from(buttons).find(
      (button) =>
        button.getAttribute('aria-label') === label || button.textContent?.trim() === label,
    );
  }
});
