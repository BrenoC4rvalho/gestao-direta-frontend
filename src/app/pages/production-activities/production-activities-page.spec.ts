import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { AuthUser } from '../../core/models/auth.models';
import { PageResponse } from '../../core/models/page-response.model';
import { ProductionActivity } from '../../core/models/production-activity.models';
import { ProductionActivityService } from '../../core/services/production-activity.service';
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
    name: 'Soja',
    description: 'Cultura anual de grãos',
    status: 'ACTIVE',
    createdAt: '2026-06-21T10:00:00',
    updatedAt: '2026-06-21T10:00:00',
  },
  {
    id: 2,
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

    sessionStore = TestBed.inject(SessionStore);
    toastStore = TestBed.inject(ToastStore);
    sessionStore.clear();
    toastStore.clear();
    sessionStore.setUser(admin);
  });

  afterEach(() => {
    sessionStore.clear();
    toastStore.clear();
    TestBed.resetTestingModule();
    document.body.classList.remove('gd-overlay-open');
  });

  it('should render title content, load service, and show returned activities', () => {
    createPage();

    const text = fixture.nativeElement.textContent;
    expect(service.list).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ASC',
      status: null,
    });
    expect(text).toContain('Atividades produtivas');
    expect(text).toContain('Total de atividades');
    expect(text).toContain('Ativas');
    expect(text).toContain('Inativas');
    expect(text).toContain('Mais usadas');
    expect(text).toContain('Em breve');
    expect(text).toContain('Soja');
    expect(text).toContain('Cultura anual de grãos');
    expect(text).toContain('Gado de leite');
    expect(getListFilters().textContent).not.toContain('Nova atividade produtiva');
    expect(text).toContain('Ativa');
    expect(text).toContain('Inativa');
  });

  it('should show access restriction and avoid API calls for non-admin users', () => {
    sessionStore.setUser(producer);
    createPage();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Acesso restrito');
    expect(text).not.toContain('Nova atividade produtiva');
    expect(service.list).not.toHaveBeenCalled();
  });

  it('should show loading state', () => {
    service.list.mockReturnValueOnce(new Subject<PageResponse<ProductionActivity>>());

    createPage();

    expect(fixture.nativeElement.textContent).toContain('Filtros');
    expect(fixture.nativeElement.querySelector('[aria-label="Carregando atividades produtivas"]')).toBeTruthy();
  });

  it('should show error state', () => {
    service.list.mockReturnValueOnce(throwError(() => new Error('fail')));

    createPage();

    expect(fixture.nativeElement.textContent).toContain(
      'Não foi possível carregar as atividades produtivas.',
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

  it('should send status ACTIVE and INACTIVE filters from chips', () => {
    createPage();

    clickButton('Ativas');
    expect(service.list).toHaveBeenLastCalledWith({
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ASC',
      status: 'ACTIVE',
    });
    expect(findButton('Ativas')?.getAttribute('aria-pressed')).toBe('true');

    clickButton('Inativas');
    expect(service.list).toHaveBeenLastCalledWith({
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

    clickButton('Editar');
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

  it('should open confirmation and call inactivate for active activities', () => {
    createPage();

    clickButton('Inativar');
    expect(getDialogText()).toContain('Inativar atividade produtiva?');
    expect(getDialogText()).toContain(
      'Esta atividade não ficará disponível para novas safras, mas registros existentes serão preservados.',
    );
    clickDialogButton('Inativar');

    expect(service.inactivate).toHaveBeenCalledWith(1);
    expect(toastStore.toasts()[0]?.title).toBe('Atividade produtiva inativada com sucesso.');
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('should open confirmation and call activate for inactive activities', () => {
    createPage();

    clickButton('Ativar');
    expect(getDialogText()).toContain('Ativar atividade produtiva?');
    expect(getDialogText()).toContain('Esta atividade voltará a ficar disponível para novas safras.');
    clickDialogButton('Ativar');

    expect(service.activate).toHaveBeenCalledWith(2);
    expect(toastStore.toasts()[0]?.title).toBe('Atividade produtiva ativada com sucesso.');
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  function createPage(): void {
    fixture = TestBed.createComponent(ProductionActivitiesPage);
    fixture.detectChanges();
  }

  function setSearch(value: string): void {
    const input = getListFilters().querySelector<HTMLInputElement>('#filter-search') as HTMLInputElement;

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

  function findButton(label: string): HTMLButtonElement | undefined {
    const element = fixture.nativeElement as HTMLElement;

    return Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === label,
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
    return (fixture.nativeElement as HTMLElement).querySelector('gd-confirm-dialog [role="dialog"]')
      ?.textContent ?? '';
  }
  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
});
