import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { AuthUser } from '../../core/models/auth.models';
import { Farm } from '../../core/models/farm.models';
import { PageResponse } from '../../core/models/page-response.model';
import { ProductionActivity } from '../../core/models/production-activity.models';
import { ProductionActivityService } from '../../core/services/production-activity.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';

import { ProductionActivitiesPage } from './production-activities-page';

const admin: AuthUser = {
  id: 1,
  name: 'Admin',
  email: 'admin@example.com',
  document: null,
  userType: 'ADMIN',
  status: 'ACTIVE',
};

const producer: AuthUser = {
  id: 2,
  name: 'Produtor',
  email: 'producer@example.com',
  document: null,
  userType: 'USER',
  status: 'ACTIVE',
};

const farm: Farm = {
  id: 10,
  name: 'Fazenda Boa Safra',
  document: null,
  city: 'Londrina',
  state: 'PR',
  totalArea: 120,
  productionType: 'AGRICULTURE',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
};

const secondFarm: Farm = {
  ...farm,
  id: 20,
  name: 'Fazenda Santa Clara',
};

interface ProductionActivitiesPageHarness {
  drawerOpen(): boolean;
  form: {
    controls: {
      name: { value: unknown; setValue(value: string): void };
      description: { setValue(value: string): void };
    };
  };
  saveActivity(): void;
}

const drawerAnimationDurationMs = 250;

const activities: ProductionActivity[] = [
  {
    id: 1,
    farmId: 10,
    farmName: 'Fazenda Boa Safra',
    name: 'Soja',
    description: 'Cultura anual de grãos',
    status: 'ACTIVE',
    createdAt: '2026-06-21T10:00:00',
    updatedAt: '2026-06-21T10:00:00',
  },
  {
    id: 2,
    farmId: 10,
    farmName: 'Fazenda Boa Safra',
    name: 'Gado de leite',
    description: 'Atividade leiteira especializada',
    status: 'INACTIVE',
    createdAt: '2026-06-21T10:00:00',
    updatedAt: '2026-06-21T10:00:00',
  },
];

function pageResponse(
  content: ProductionActivity[],
  page = 0,
  totalPages = content.length > 0 ? 1 : 0,
): PageResponse<ProductionActivity> {
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

describe('ProductionActivitiesPage', () => {
  let fixture: ComponentFixture<ProductionActivitiesPage>;
  let service: {
    list: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    activate: ReturnType<typeof vi.fn>;
    inactivate: ReturnType<typeof vi.fn>;
  };
  let selectedFarmStore: SelectedFarmStore;
  let farmAccessStore: FarmAccessStore;
  let sessionStore: SessionStore;
  let toastStore: ToastStore;

  beforeEach(async () => {
    service = {
      list: vi.fn().mockReturnValue(of(pageResponse(activities))),
      getById: vi.fn().mockReturnValue(of(activities[0])),
      create: vi.fn().mockReturnValue(of({ ...activities[0], id: 3, name: 'Milho' })),
      update: vi.fn().mockReturnValue(of({ ...activities[0], name: 'Soja verão' })),
      activate: vi.fn().mockReturnValue(of({ ...activities[1], status: 'ACTIVE' })),
      inactivate: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [ProductionActivitiesPage],
      providers: [
        provideGestaoDiretaIcons(),
        { provide: ProductionActivityService, useValue: service },
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
    selectedFarmStore.setFarms([farm]);
  });

  afterEach(() => {
    selectedFarmStore.clear();
    farmAccessStore.clear();
    sessionStore.clear();
    toastStore.clear();
    TestBed.resetTestingModule();
    document.body.classList.remove('gd-overlay-open');
  });

  it('should render title content, load service, show activities, and avoid direct status actions', () => {
    createPage();

    const text = fixture.nativeElement.textContent;
    expect(service.list).toHaveBeenCalledWith({
      farmId: 10,
      search: '',
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ASC',
      status: null,
    });
    expect(text).toContain('Atividades produtivas');
    expect(text).toContain('Filtros');
    expect(text).not.toContain('Total de atividades');
    expect(text).not.toContain('Mais usadas');
    expect(
      fixture.nativeElement.querySelector('[aria-label="Resumo de atividades produtivas"]'),
    ).toBeNull();
    expect(text).toContain('Soja');
    expect(text).toContain('Cultura anual de grãos');
    expect(text).toContain('Gado de leite');
    expect(getListFilters().textContent).not.toContain('Nova atividade produtiva');
    expect(text).toContain('Ativa');
    expect(text).toContain('Inativa');
    const editButton = findButton('Editar atividade produtiva');
    expect(editButton?.getAttribute('title')).toBe('Editar atividade produtiva');
    expect(editButton?.querySelector('svg[lucideIcon="pencil"]')).toBeTruthy();
    expect(editButton?.textContent?.trim()).toBe('');
    expect(fixture.nativeElement.querySelector('thead th:last-child .sr-only')?.textContent?.trim()).toBe('Ações');
    expect(findButton('Inativar')).toBeUndefined();
    expect(findButton('Ativar')).toBeUndefined();
  });

  it('should show empty state and avoid API calls without a selected farm', () => {
    selectedFarmStore.clear();

    createPage();

    expect(fixture.nativeElement.textContent).toContain(
      'Selecione uma fazenda para visualizar as atividades produtivas.',
    );
    expect(service.list).not.toHaveBeenCalled();
  });

  it('should allow producers to manage production activities for the selected farm', () => {
    sessionStore.setUser(producer);
    setFarmAccess(farm, 'PRODUCER');

    createPage();

    expect(service.list).toHaveBeenCalledWith({
      farmId: 10,
      search: '',
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ASC',
      status: null,
    });
    expect(findButton('Nova atividade produtiva')).toBeTruthy();
    expect(findButton('Editar atividade produtiva')).toBeTruthy();
  });

  it('should allow employees to view without management actions', () => {
    sessionStore.setUser(producer);
    setFarmAccess(farm, 'EMPLOYEE');

    createPage();

    expect(service.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Soja');
    expect(findButton('Nova atividade produtiva')).toBeUndefined();
    expect(findButton('Editar atividade produtiva')).toBeUndefined();
  });

  it('should show loading state', () => {
    service.list.mockReturnValueOnce(new Subject<PageResponse<ProductionActivity>>());

    createPage();

    expect(fixture.nativeElement.textContent).toContain('Filtros');
    expect(
      fixture.nativeElement.querySelector('[aria-label="Carregando atividades produtivas"]'),
    ).toBeTruthy();
  });

  it('should show error state', () => {
    service.list.mockReturnValueOnce(throwError(() => new Error('fail')));

    createPage();

    expect(fixture.nativeElement.textContent).toContain(
      'Não foi possível carregar as atividades produtivas da fazenda.',
    );
  });

  it('should show empty state without filters', () => {
    service.list.mockReturnValueOnce(of(pageResponse([])));

    createPage();

    expect(fixture.nativeElement.textContent).toContain('Nenhuma atividade produtiva cadastrada.');
  });

  it('should filter locally by activity name and description', () => {
    createPage();

    setSearch('leiteira');

    expect(getActivityCard('Gado de leite')).toBeTruthy();
    expect(getActivityCard('Soja')).toBeNull();
  });

  it('should show filtered empty state for local search without matches', () => {
    createPage();

    setSearch('banana');

    expect(fixture.nativeElement.textContent).toContain(
      'Nenhuma atividade produtiva encontrada para os filtros informados.',
    );
  });


  it('should clear stale data and reload when the selected farm changes', () => {
    const secondFarmActivity: ProductionActivity = {
      ...activities[0],
      id: 20,
      farmId: 20,
      farmName: 'Fazenda Santa Clara',
      name: 'Milho Santa Clara',
    };

    service.list.mockImplementation((params: { farmId: number }) =>
      of(params.farmId === 20 ? pageResponse([secondFarmActivity]) : pageResponse(activities)),
    );

    createPage();
    expect(fixture.nativeElement.textContent).toContain('Soja');

    selectedFarmStore.setFarms([farm, secondFarm]);
    selectedFarmStore.selectFarmById(20);
    fixture.detectChanges();

    expect(service.list).toHaveBeenLastCalledWith({
      farmId: 20,
      search: '',
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ASC',
      status: null,
    });
    expect(fixture.nativeElement.textContent).toContain('Milho Santa Clara');
    expect(fixture.nativeElement.textContent).not.toContain('Gado de leite');
  });

  it('should send status ACTIVE and INACTIVE filters from chips', () => {
    createPage();

    clickButton('Ativas');
    expect(service.list).toHaveBeenLastCalledWith({
      farmId: 10,
      search: '',
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ASC',
      status: 'ACTIVE',
    });
    expect(findButton('Ativas')?.getAttribute('aria-pressed')).toBe('true');

    clickButton('Inativas');
    expect(service.list).toHaveBeenLastCalledWith({
      farmId: 10,
      search: '',
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ASC',
      status: 'INACTIVE',
    });
    expect(findButton('Inativas')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('should keep filters when changing pages', () => {
    service.list.mockReturnValue(of(pageResponse(activities, 0, 2)));
    createPage();
    clickButton('Ativas');
    service.list.mockReturnValueOnce(of(pageResponse(activities, 1, 2)));

    clickButton('Próxima');

    expect(service.list).toHaveBeenLastCalledWith({
      farmId: 10,
      search: '',
      page: 1,
      size: 10,
      sort: 'name',
      direction: 'ASC',
      status: 'ACTIVE',
    });
  });

  it('should open create drawer and call create when saving', async () => {
    createPage();

    clickButton('Nova atividade produtiva');
    await wait(drawerAnimationDurationMs + 10);
    fixture.detectChanges();
    expect(getPageHarness().drawerOpen()).toBe(true);
    getPageHarness().form.controls.name.setValue('  Milho  ');
    getPageHarness().form.controls.description.setValue('  Cultura anual  ');
    getPageHarness().saveActivity();
    fixture.detectChanges();

    expect(service.create).toHaveBeenCalledWith({
      farmId: 10,
      name: 'Milho',
      description: 'Cultura anual',
    });
    expect(toastStore.toasts()[0]?.title).toBe('Atividade produtiva criada com sucesso.');
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('should require name when creating', async () => {
    createPage();

    clickButton('Nova atividade produtiva');
    await wait(drawerAnimationDurationMs + 10);
    fixture.detectChanges();
    getPageHarness().saveActivity();
    fixture.detectChanges();

    expect(service.create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Informe o nome da atividade produtiva.');
  });

  it('should open edit drawer with selected activity and call update when saving', async () => {
    createPage();

    clickButton('Editar atividade produtiva');
    await wait(drawerAnimationDurationMs + 10);
    fixture.detectChanges();
    expect(getPageHarness().drawerOpen()).toBe(true);
    expect(getPageHarness().form.controls.name.value).toBe('Soja');
    getPageHarness().form.controls.name.setValue('Soja verão');
    getPageHarness().form.controls.description.setValue('Cultivo de soja no verão');
    getPageHarness().saveActivity();
    fixture.detectChanges();

    expect(service.update).toHaveBeenCalledWith(1, {
      name: 'Soja verão',
      description: 'Cultivo de soja no verão',
    });
    expect(toastStore.toasts()[0]?.title).toBe('Atividade produtiva atualizada com sucesso.');
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('should show status action without current status card in the edit drawer for active activities', async () => {
    createPage();

    clickButton('Editar atividade produtiva');
    await wait(drawerAnimationDurationMs + 10);
    fixture.detectChanges();

    const drawerText = getDrawerText();
    expect(drawerText).not.toContain('Status atual');
    expect(drawerText).toContain('Status da atividade');
    expect(drawerText).toContain('Ativa');
    expect(drawerText).toContain('Esta atividade está disponível para ser usada em novas safras.');
    expect(findButton('Inativar')).toBeTruthy();
    expect(findButton('Inativar atividade produtiva')).toBeUndefined();
  });

  it('should open confirmation and call inactivate from the edit drawer for active activities', async () => {
    createPage();

    clickButton('Editar atividade produtiva');
    await wait(drawerAnimationDurationMs + 10);
    fixture.detectChanges();
    clickButton('Inativar');
    expect(getDialogText()).toContain('Inativar atividade produtiva?');
    expect(getDialogText()).toContain(
      'Esta atividade não ficará disponível para novas safras, mas registros existentes serão preservados.',
    );
    clickDialogButton('Inativar');

    expect(service.inactivate).toHaveBeenCalledWith(1);
    expect(getPageHarness().drawerOpen()).toBe(false);
    expect(toastStore.toasts()[0]?.title).toBe('Atividade produtiva inativada com sucesso.');
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('should show status action without current status card in the edit drawer for inactive activities', async () => {
    createPage();

    clickButtonIn(getActivityCard('Gado de leite') as HTMLElement, 'Editar atividade produtiva');
    await wait(drawerAnimationDurationMs + 10);
    fixture.detectChanges();

    const drawerText = getDrawerText();
    expect(drawerText).not.toContain('Status atual');
    expect(drawerText).toContain('Status da atividade');
    expect(drawerText).toContain('Inativa');
    expect(drawerText).toContain('Esta atividade não está disponível para novas safras.');
    expect(findButton('Ativar')).toBeTruthy();
    expect(findButton('Ativar atividade produtiva')).toBeUndefined();
  });

  it('should open confirmation and call activate from the edit drawer for inactive activities', async () => {
    createPage();

    clickButtonIn(getActivityCard('Gado de leite') as HTMLElement, 'Editar atividade produtiva');
    await wait(drawerAnimationDurationMs + 10);
    fixture.detectChanges();
    clickButton('Ativar');
    expect(getDialogText()).toContain('Ativar atividade produtiva?');
    expect(getDialogText()).toContain(
      'Esta atividade voltará a ficar disponível para novas safras.',
    );
    clickDialogButton('Ativar');

    expect(service.activate).toHaveBeenCalledWith(2);
    expect(getPageHarness().drawerOpen()).toBe(false);
    expect(toastStore.toasts()[0]?.title).toBe('Atividade produtiva ativada com sucesso.');
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  function createPage(): void {
    fixture = TestBed.createComponent(ProductionActivitiesPage);
    fixture.detectChanges();
  }

  function setFarmAccess(item: Farm, role: 'PRODUCER' | 'EMPLOYEE' | 'ACCOUNTANT'): void {
    farmAccessStore.setAccess({
      farmId: item.id,
      farmName: item.name,
      userId: 1,
      userType: 'USER',
      role,
      permissions: {
        canViewFarm: true,
        canEditFarm: role === 'PRODUCER',
        canChangeFarmStatus: false,
        canManageFarmUsers: role === 'PRODUCER',
        canViewFinancial: true,
        canManageTransactions: role === 'PRODUCER',
        canManageCategories: role === 'PRODUCER',
        canManageGlobalCategories: false,
        canCreateFarm: false,
      },
    });
  }

  function setSearch(value: string): void {
    const input = getListFilters().querySelector<HTMLInputElement>(
      '#filter-search',
    ) as HTMLInputElement;

    input.value = value;
    input.dispatchEvent(new Event('input'));
    clickFilterButton('Aplicar filtros');
  }

  function getListFilters(): HTMLElement {
    return fixture.nativeElement.querySelector('gd-list-filters') as HTMLElement;
  }

  function clickFilterButton(label: string): void {
    const button = Array.from(getListFilters().querySelectorAll('button')).find(
      (item) => item.getAttribute('aria-label') === label || item.getAttribute('title') === label,
    );

    button?.click();
    fixture.detectChanges();
  }

  function getActivityCard(name: string): HTMLElement | null {
    const element = fixture.nativeElement as HTMLElement;
    return element.querySelector('[aria-label="Atividade produtiva ' + name + '"]');
  }

  function clickButton(label: string): void {
    findButton(label)?.click();
    fixture.detectChanges();
  }

  function clickButtonIn(container: HTMLElement, label: string): void {
    Array.from(container.querySelectorAll('button'))
      .find((button) => button.getAttribute('aria-label') === label || button.textContent?.trim() === label)
      ?.click();
    fixture.detectChanges();
  }

  function findButton(label: string): HTMLButtonElement | undefined {
    const element = fixture.nativeElement as HTMLElement;

    return Array.from(element.querySelectorAll('button')).find(
      (button) => button.getAttribute('aria-label') === label || button.textContent?.trim() === label,
    );
  }

  function clickDialogButton(label: string): void {
    const element = fixture.nativeElement as HTMLElement;
    const dialogs = Array.from(element.querySelectorAll('gd-confirm-dialog [role="dialog"]'));
    const button = dialogs
      .flatMap((dialog) => Array.from(dialog.querySelectorAll('button')))
      .find((item) => item.textContent?.trim() === label);

    button?.click();
    fixture.detectChanges();
  }

  function getPageHarness(): ProductionActivitiesPageHarness {
    return fixture.componentInstance as unknown as ProductionActivitiesPageHarness;
  }

  function getDrawerDialog(): HTMLElement | null {
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('gd-drawer [role="dialog"]');
  }

  function getDialogText(): string {
    return (
      (fixture.nativeElement as HTMLElement).querySelector('gd-confirm-dialog [role="dialog"]')
        ?.textContent ?? ''
    );
  }

  function getDrawerText(): string {
    return getDrawerDialog()?.textContent ?? '';
  }

  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
});
