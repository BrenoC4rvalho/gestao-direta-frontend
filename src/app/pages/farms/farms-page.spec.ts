import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { FarmAccessResponse } from '../../core/models/farm-access.models';
import { AuthUser } from '../../core/models/auth.models';
import { Farm } from '../../core/models/farm.models';
import { PageResponse } from '../../core/models/page-response.model';
import { FarmService } from '../../core/services/farm.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';

import { FarmsPage } from './farms-page';

const drawerAnimationDurationMs = 250;
const confirmAnimationDurationMs = 200;

const admin: AuthUser = {
  id: 1,
  name: 'Admin',
  email: 'admin@example.com',
  document: null,
  userType: 'ADMIN',
  status: 'ACTIVE',
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

const farms: Farm[] = [
  {
    id: 1,
    name: 'Fazenda Boa Safra',
    document: '12345678900',
    city: 'Ribeirão Preto',
    state: 'SP',
    totalArea: 120,
    productionType: 'AGRICULTURE',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-10T00:00:00Z',
  },
  {
    id: 2,
    name: 'Sítio Santa Clara',
    document: '12345678000190',
    city: 'Uberaba',
    state: 'MG',
    totalArea: 80,
    productionType: 'MIXED',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-10T00:00:00Z',
  },
];

function pageResponse(
  content: Farm[],
  page = 0,
  totalPages = content.length > 0 ? 1 : 0,
): PageResponse<Farm> {
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

describe('FarmsPage', () => {
  let fixture: ComponentFixture<FarmsPage>;
  let farmService: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateStatus: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let farmAccessStore: FarmAccessStore;
  let selectedFarmStore: SelectedFarmStore;
  let sessionStore: SessionStore;
  let toastStore: ToastStore;

  beforeEach(async () => {
    farmService = {
      list: vi.fn().mockReturnValue(of(pageResponse(farms))),
      create: vi.fn().mockReturnValue(of({ ...farms[0], id: 3, name: 'Fazenda Nova' })),
      update: vi.fn().mockReturnValue(of({ ...farms[0], name: 'Fazenda Atualizada' })),
      updateStatus: vi.fn().mockReturnValue(of({ ...farms[0], status: 'INACTIVE' })),
      delete: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [FarmsPage],
      providers: [
        provideGestaoDiretaIcons(),
        { provide: FarmService, useValue: farmService },
      ],
    }).compileComponents();

    farmAccessStore = TestBed.inject(FarmAccessStore);
    selectedFarmStore = TestBed.inject(SelectedFarmStore);
    sessionStore = TestBed.inject(SessionStore);
    toastStore = TestBed.inject(ToastStore);
    farmAccessStore.clear();
    selectedFarmStore.clear();
    sessionStore.clear();
    sessionStore.setUser(admin);
    toastStore.clear();
  });

  afterEach(() => {
    farmAccessStore.clear();
    selectedFarmStore.clear();
    sessionStore.clear();
    toastStore.clear();
  });

  function createPage(): void {
    fixture = TestBed.createComponent(FarmsPage);
    fixture.detectChanges();
  }

  it('should render farms and load farms', () => {
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Fazenda Boa Safra');
    expect(fixture.nativeElement.textContent).toContain('123.456.789-00');
    expect(fixture.nativeElement.textContent).toContain('12.345.678/0001-90');
    expect(farmService.list).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ASC',
    });
  });

  it('should render production quick filters without duplicated production select', () => {
    createPage();

    const filters = getListFilters();
    expect(filters.textContent).toContain('Busque por fazenda e filtre por documento, status ou tipo de produção');
    expect(filters.querySelector('#filter-productionType')).toBeNull();
    expect(filters.querySelector('#filter-status')).toBeTruthy();
    expect(filters.textContent).toContain('Produção');
    expect(findButton(filters, 'Todos')).toBeTruthy();
    expect(findButton(filters, 'Agricultura')).toBeTruthy();
    expect(findButton(filters, 'Pecuária')).toBeTruthy();
    expect(findButton(filters, 'Mista')).toBeTruthy();
    expect(findButton(filters, 'Outro')).toBeTruthy();
  });

  it('should apply production quick filter immediately', () => {
    createPage();

    clickFilterButton('Agricultura');

    expect(farmService.list).toHaveBeenLastCalledWith({
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ASC',
      productionType: 'AGRICULTURE',
    });
  });

  it('should apply manual farm filters without production select', () => {
    createPage();

    setFilterInput('#filter-search', ' Boa Safra ');
    setFilterInput('#filter-document', ' 12345678900 ');
    setFilterSelect('#filter-status', 'Ativa');
    clickFilterButton('Aplicar filtros');

    expect(farmService.list).toHaveBeenLastCalledWith({
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ASC',
      search: 'Boa Safra',
      document: '12345678900',
      status: 'ACTIVE',
    });
  });

  it('should clear selected production quick filter', () => {
    createPage();
    clickFilterButton('Agricultura');

    expect(findButton(getListFilters(), 'Agricultura')?.getAttribute('aria-pressed')).toBe('true');

    clickFilterButton('Limpar filtros');

    expect(findButton(getListFilters(), 'Agricultura')?.getAttribute('aria-pressed')).toBe('false');
    expect(farmService.list).toHaveBeenLastCalledWith({
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ASC',
    });
  });

  it('should show skeletons while loading', () => {
    farmService.list.mockReturnValueOnce(new Subject<PageResponse<Farm>>());
    createPage();

    expect(
      fixture.nativeElement.querySelector('[aria-label="Carregando fazendas"]'),
    ).toBeTruthy();
  });

  it('should open create drawer and submit a new farm', () => {
    createPage();
    clickButton('Nova fazenda');

    expect(fixture.nativeElement.textContent).toContain('Preencha os dados principais');
    setInput('#farm-name', 'Fazenda Nova');
    setInput('#farm-document', '12.345.678/0001-90');
    submitForm();

    expect(farmService.create).toHaveBeenCalledWith({
      name: 'Fazenda Nova',
      document: '12345678000190',
      city: null,
      state: null,
      totalArea: null,
      productionType: null,
    });
    expect(farmService.list).toHaveBeenCalledTimes(2);
    expect(toastStore.toasts()[0]?.title).toBe('Fazenda criada.');
  });

  it('should open edit drawer with values and submit changes', () => {
    createPage();
    clickButton('Editar');

    const nameInput = getInput(fixture.nativeElement, '#farm-name');
    expect(nameInput.value).toBe('Fazenda Boa Safra');
    setInput('#farm-name', 'Fazenda Atualizada');
    submitForm();

    expect(farmService.update).toHaveBeenCalledWith(1, {
      name: 'Fazenda Atualizada',
      document: '12345678900',
      city: 'Ribeirão Preto',
      state: 'SP',
      totalArea: 120,
      productionType: 'AGRICULTURE',
    });
    expect(toastStore.toasts()[0]?.title).toBe('Fazenda atualizada.');
  });

  it('should render the status section without the old danger zone label', () => {
    createPage();
    clickButton('Editar');

    const drawer = getDrawerDialog();
    expect(drawer?.textContent).toContain('Status da Fazenda');
    expect(drawer?.textContent).toContain(
      'Inative esta fazenda caso ela não deva mais ser usada no sistema.',
    );
    expect(drawer?.textContent).not.toContain('Zona de perigo');
  });

  it('should open inactivation confirmation over the edit drawer and cancel only the confirmation', async () => {
    createPage();
    clickButton('Editar');
    clickButton('Inativar fazenda');

    expect(getDrawerDialog()).toBeTruthy();
    expect(getConfirmDialog()?.textContent).toContain('Inativar fazenda');

    clickDialogButton(getConfirmDialog(), 'Cancelar');
    await finishConfirmClose();

    expect(getConfirmDialog()).toBeNull();
    expect(getDrawerDialog()).toBeTruthy();
    expect(farmService.updateStatus).not.toHaveBeenCalled();
  });

  it('should confirm farm inactivation, update context, close overlays and reload the list', async () => {
    const updatedFarm = { ...farms[0], status: 'INACTIVE' as const };
    farmService.updateStatus.mockReturnValueOnce(of(updatedFarm));
    const upsertSpy = vi.spyOn(selectedFarmStore, 'upsertFarm');
    createPage();
    clickButton('Editar');
    clickButton('Inativar fazenda');

    clickDialogButton(getConfirmDialog(), 'Inativar');

    expect(farmService.updateStatus).toHaveBeenCalledWith(1, { status: 'INACTIVE' });
    expect(upsertSpy).toHaveBeenCalledWith(updatedFarm);
    await finishConfirmClose();
    expect(getConfirmDialog()).toBeNull();
    await finishDrawerClose();
    expect(getDrawerDialog()).toBeNull();
    expect(farmService.list).toHaveBeenCalledTimes(2);
    expect(toastStore.toasts()[0]?.title).toBe('Fazenda inativada.');
  });

  it('should keep the drawer open and show permission feedback on 403', () => {
    farmService.update.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
          }),
      ),
    );
    createPage();
    clickButton('Editar');
    submitForm();

    expect(fixture.nativeElement.querySelector('gd-drawer [role="dialog"]')).toBeTruthy();
    expect(toastStore.toasts()[0]?.title).toBe(
      'Você não tem permissão para realizar esta ação.',
    );
  });

  it('should not show local selection or direct status actions in the list', () => {
    createPage();

    const listText = fixture.nativeElement.querySelector('section')?.textContent as string;
    expect(listText).not.toContain('Selecionar');
    expect(listText).not.toContain('Selecionada');
    expect(listText).not.toContain('Indisponível');
    expect(listText).not.toContain('Inativar');
    expect(fixture.nativeElement.querySelector('article[data-selected]')).toBeNull();
  });

  it('should show edit only for the selected farm when the user has permission', () => {
    sessionStore.setUser({ ...admin, userType: 'USER' });
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(producerAccess);
    createPage();

    expect(findButton(fixture.nativeElement, 'Nova fazenda')).toBeUndefined();
    expect(findButton(fixture.nativeElement, 'Inativar fazenda')).toBeUndefined();
    expect(findButtons(fixture.nativeElement, 'Editar')).toHaveLength(1);
  });

  it('should hide edit and status actions without permission', () => {
    sessionStore.setUser({ ...admin, userType: 'USER' });
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess({
      ...producerAccess,
      permissions: {
        ...producerAccess.permissions,
        canEditFarm: false,
        canChangeFarmStatus: false,
      },
    });
    createPage();

    expect(findButton(fixture.nativeElement, 'Editar')).toBeUndefined();
    expect(findButton(fixture.nativeElement, 'Inativar fazenda')).toBeUndefined();
  });

  it('should show status action in the edit drawer for the selected farm with permission', () => {
    sessionStore.setUser({ ...admin, userType: 'USER' });
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess({
      ...producerAccess,
      permissions: { ...producerAccess.permissions, canChangeFarmStatus: true },
    });
    createPage();
    clickButton('Editar');

    expect(findButton(fixture.nativeElement, 'Inativar fazenda')).toBeTruthy();
  });

  it('should confirm farm activation for an inactive farm with the same drawer flow', async () => {
    const inactiveFarm = { ...farms[0], status: 'INACTIVE' as const };
    const updatedFarm = { ...inactiveFarm, status: 'ACTIVE' as const };
    farmService.list.mockReturnValueOnce(of(pageResponse([inactiveFarm])));
    farmService.updateStatus.mockReturnValueOnce(of(updatedFarm));
    const upsertSpy = vi.spyOn(selectedFarmStore, 'upsertFarm');
    createPage();
    clickButton('Editar');

    const drawer = getDrawerDialog();
    expect(drawer?.textContent).toContain('Status da Fazenda');
    expect(drawer?.textContent).toContain('Reative esta fazenda para permitir seu uso novamente.');
    expect(findButton(fixture.nativeElement, 'Ativar fazenda')).toBeTruthy();
    clickButton('Ativar fazenda');

    expect(getDrawerDialog()).toBeTruthy();
    expect(getConfirmDialog()?.textContent).toContain('Ativar fazenda');
    clickDialogButton(getConfirmDialog(), 'Ativar');

    expect(farmService.updateStatus).toHaveBeenCalledWith(1, { status: 'ACTIVE' });
    expect(upsertSpy).toHaveBeenCalledWith(updatedFarm);
    await finishConfirmClose();
    expect(getConfirmDialog()).toBeNull();
    await finishDrawerClose();
    expect(getDrawerDialog()).toBeNull();
    expect(farmService.list).toHaveBeenCalledTimes(2);
    expect(toastStore.toasts()[0]?.title).toBe('Fazenda ativada.');
  });

  it('should hide status action in the edit drawer without status permission', () => {
    sessionStore.setUser({ ...admin, userType: 'USER' });
    selectedFarmStore.setFarms(farms);
    farmAccessStore.setAccess(producerAccess);
    createPage();
    clickButton('Editar');

    expect(findButton(fixture.nativeElement, 'Inativar fazenda')).toBeUndefined();
    expect(findButton(fixture.nativeElement, 'Ativar fazenda')).toBeUndefined();
  });

  it('should close the status confirmation when the drawer is manually closed', async () => {
    createPage();
    clickButton('Editar');
    clickButton('Inativar fazenda');

    const confirmButton = findButton(getConfirmDialog() as HTMLElement, 'Inativar');
    getDrawerDialog()?.querySelector<HTMLButtonElement>('[aria-label="Fechar drawer"]')?.click();
    fixture.detectChanges();
    confirmButton?.click();
    fixture.detectChanges();
    await finishDrawerClose();

    expect(getDrawerDialog()).toBeNull();
    expect(getConfirmDialog()).toBeNull();
    expect(farmService.updateStatus).not.toHaveBeenCalled();
  });

  it('should close only the status confirmation on Escape when both overlays are open', async () => {
    createPage();
    clickButton('Editar');
    clickButton('Inativar fazenda');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    await finishConfirmClose();

    expect(getConfirmDialog()).toBeNull();
    expect(getDrawerDialog()).toBeTruthy();
  });

  it('should close the drawer on Escape when no confirmation is open', async () => {
    createPage();
    clickButton('Editar');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    await finishDrawerClose();

    expect(getDrawerDialog()).toBeNull();
  });

  function clickButton(label: string): void {
    findButton(fixture.nativeElement, label)?.click();
    fixture.detectChanges();
  }

  function setInput(selector: string, value: string): void {
    const input = getInput(fixture.nativeElement, selector);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function clickFilterButton(label: string): void {
    const filters = getListFilters();
    const button =
      filters.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`) ??
      findButton(filters, label);

    button?.click();
    fixture.detectChanges();
  }

  function setFilterInput(selector: string, value: string): void {
    const input = getListFilters().querySelector<HTMLInputElement>(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function setFilterSelect(selector: string, label: string): void {
    const select = getListFilters().querySelector<HTMLSelectElement>(selector) as HTMLSelectElement;
    const option = Array.from(select.options).find((item) => item.textContent?.trim() === label);

    if (!option) {
      throw new Error('Option not found: ' + label);
    }

    select.selectedIndex = option.index;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function getListFilters(): HTMLElement {
    return fixture.nativeElement.querySelector('gd-list-filters') as HTMLElement;
  }

  function submitForm(): void {
    const form = fixture.nativeElement.querySelector('gd-farm-form form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
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

  function clickDialogButton(dialog: HTMLElement | null, label: string): void {
    expect(dialog).toBeTruthy();
    findButton(dialog as HTMLElement, label)?.click();
    fixture.detectChanges();
  }
});

function getInput(root: HTMLElement, selector: string): HTMLInputElement {
  const indexes: Record<string, number> = {
    '#farm-name': 0,
    '#farm-document': 1,
    '#farm-city': 2,
    '#farm-state': 3,
    '#farm-total-area': 4,
  };

  const formRoot = root.querySelector('gd-farm-form') ?? root;

  return formRoot.querySelectorAll<HTMLInputElement>('gd-input input')[indexes[selector]];
}

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

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
