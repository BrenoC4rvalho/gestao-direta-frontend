import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Mock, vi } from 'vitest';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { Farm } from '../../core/models/farm.models';
import { HarvestSeason } from '../../core/models/harvest-season.models';
import { PageResponse } from '../../core/models/page-response.model';
import { ProductionActivity } from '../../core/models/production-activity.models';
import { HarvestSeasonService } from '../../core/services/harvest-season.service';
import { ProductionActivityService } from '../../core/services/production-activity.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { HarvestsPage } from './harvests-page';

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

const activities: ProductionActivity[] = [
  {
    id: 2,
    name: 'Soja',
    description: 'Cultivo de soja',
    status: 'ACTIVE',
  },
];

const seasons: HarvestSeason[] = [
  {
    id: 1,
    farmId: 10,
    farmName: 'Fazenda Boa Safra',
    productionActivityId: 2,
    productionActivityName: 'Soja',
    name: 'Safra Soja 2026',
    description: 'Safra de verao',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    expectedRevenue: 150000,
    expectedCost: 90000,
    areaHectares: 120.5,
    status: 'PLANNED',
  },
  {
    id: 2,
    farmId: 10,
    farmName: 'Fazenda Boa Safra',
    productionActivityId: 2,
    productionActivityName: 'Soja',
    name: 'Safra Soja Inverno',
    description: null,
    startDate: '2026-07-01',
    endDate: '2026-11-30',
    expectedRevenue: 80000,
    expectedCost: 40000,
    areaHectares: 80,
    status: 'IN_PROGRESS',
  },

  {
    id: 3,
    farmId: 10,
    farmName: 'Fazenda Boa Safra',
    productionActivityId: 2,
    productionActivityName: 'Soja',
    name: 'Safra Inativa',
    description: null,
    startDate: '2025-01-01',
    endDate: '2025-06-30',
    expectedRevenue: 40000,
    expectedCost: 10000,
    areaHectares: null,
    status: 'INACTIVE',
  },
];

const response: PageResponse<HarvestSeason> = {
  content: seasons,
  page: 0,
  size: 10,
  totalElements: 3,
  totalPages: 1,
  first: true,
  last: true,
};

describe('HarvestsPage', () => {
  let fixture: ComponentFixture<HarvestsPage>;
  let harvestService: {
    list: Mock;
    create: Mock;
    update: Mock;
    updateStatus: Mock;
    activate: Mock;
    inactivate: Mock;
  };
  let productionActivityService: { listActive: Mock };
  let selectedFarmStore: SelectedFarmStore;
  let farmAccessStore: FarmAccessStore;
  let sessionStore: SessionStore;

  beforeEach(async () => {
    harvestService = {
      list: vi.fn(() => of(response)),
      create: vi.fn(() => of(seasons[0])),
      update: vi.fn(() => of(seasons[0])),
      updateStatus: vi.fn(() => of({ ...seasons[0], status: 'IN_PROGRESS' })),
      activate: vi.fn(() => of({ ...seasons[2], status: 'PLANNED' })),
      inactivate: vi.fn(() => of(undefined)),
    };
    productionActivityService = {
      listActive: vi.fn(() => of(activities)),
    };

    await TestBed.configureTestingModule({
      imports: [HarvestsPage],
      providers: [
        provideGestaoDiretaIcons(),
        provideRouter([]),
        { provide: HarvestSeasonService, useValue: harvestService },
        { provide: ProductionActivityService, useValue: productionActivityService },
      ],
    }).compileComponents();

    selectedFarmStore = TestBed.inject(SelectedFarmStore);
    farmAccessStore = TestBed.inject(FarmAccessStore);
    sessionStore = TestBed.inject(SessionStore);
    TestBed.inject(ToastStore);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.classList.remove('gd-overlay-open');
  });

  it('should not call the API without a selected farm', () => {
    sessionStore.setUser(user('USER'));
    fixture = TestBed.createComponent(HarvestsPage);
    fixture.detectChanges();

    expect(harvestService.list).not.toHaveBeenCalled();
    expect(productionActivityService.listActive).not.toHaveBeenCalled();
    expect(text()).toContain('Selecione uma fazenda para visualizar as safras.');
  });

  it('should load harvest seasons and production activities for the selected farm', () => {
    setupSelectedFarm('PRODUCER');

    expect(harvestService.list).toHaveBeenCalledWith({
      farmId: 10,
      includeInactive: true,
      page: 0,
      size: 10,
      sort: 'startDate',
      direction: 'DESC',
    });
    expect(productionActivityService.listActive).toHaveBeenCalled();
    expect(text()).toContain('Safras');
    expect(text()).toContain('Safra Soja 2026');
    expect(text()).toContain('Safras ativas');
    expect(text()).toContain('270.000,00');
    expect(text()).toContain('130.000,00');
  });

  it('should filter the loaded page locally by status', () => {
    setupSelectedFarm('PRODUCER');

    const initialCalls = harvestService.list.mock.calls.length;

    clickButton('Em andamento');

    expect(text()).toContain('Safra Soja Inverno');
    expect(text()).not.toContain('Safra Soja 2026');
    expect(harvestService.list).toHaveBeenCalledTimes(initialCalls);
  });

  it('should render detail links for each harvest', () => {
    setupSelectedFarm('PRODUCER');

    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'))
      .map((link) => link.getAttribute('href'))
      .filter(Boolean);

    expect(text()).toContain('Ver detalhes');
    expect(links).toContain('/harvests/1');
    expect(links).toContain('/harvests/2');
    expect(links).toContain('/harvests/3');
  });

  it('should hide management actions for employees', () => {
    setupSelectedFarm('EMPLOYEE');

    expect(text()).not.toContain('Nova safra');
    expect(text()).not.toContain('Editar');
    expect(text()).not.toContain('Inativar');
    expect(text()).not.toContain('Ativar');
  });

  it('should create a harvest season from the drawer form', () => {
    setupSelectedFarm('PRODUCER');
    const component = fixture.componentInstance as unknown as HarvestsPage & { openCreateDrawer(): void; form: any; saveHarvest(): void };

    component.openCreateDrawer();
    component.form.setValue({
      productionActivityId: 2,
      name: 'Safra Nova',
      description: 'Nova safra de soja',
      startDate: '2026-02-01',
      endDate: '2026-08-01',
      expectedCost: '10.000,50',
      expectedRevenue: '20.000,75',
      areaHectares: 30,
      status: 'PLANNED',
    });
    component.saveHarvest();

    expect(harvestService.create).toHaveBeenCalledWith({
      farmId: 10,
      productionActivityId: 2,
      name: 'Safra Nova',
      description: 'Nova safra de soja',
      startDate: '2026-02-01',
      endDate: '2026-08-01',
      expectedCost: 10000.5,
      expectedRevenue: 20000.75,
      areaHectares: 30,
    });
  });

  it('should update a harvest and status when editing', () => {
    setupSelectedFarm('PRODUCER');
    const component = fixture.componentInstance as unknown as HarvestsPage & {
      openEditDrawer(harvest: HarvestSeason): void;
      form: any;
      saveHarvest(): void;
    };

    component.openEditDrawer(seasons[0]);
    component.form.patchValue({ name: 'Safra Editada', status: 'IN_PROGRESS' });
    component.saveHarvest();

    expect(harvestService.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ name: 'Safra Editada', productionActivityId: 2 }),
    );
    expect(harvestService.updateStatus).toHaveBeenCalledWith(1, 'IN_PROGRESS');
  });


  it('should activate an inactive harvest from the list', () => {
    setupSelectedFarm('PRODUCER');
    const component = fixture.componentInstance as unknown as HarvestsPage & {
      activateHarvest(harvest: HarvestSeason): void;
    };

    component.activateHarvest(seasons[2]);

    expect(harvestService.activate).toHaveBeenCalledWith(3);
  });

  it('should activate an inactive harvest when editing to an active status', () => {
    setupSelectedFarm('PRODUCER');
    const component = fixture.componentInstance as unknown as HarvestsPage & {
      openEditDrawer(harvest: HarvestSeason): void;
      form: any;
      saveHarvest(): void;
    };

    component.openEditDrawer(seasons[2]);
    component.form.patchValue({ status: 'PLANNED' });
    component.saveHarvest();

    expect(harvestService.activate).toHaveBeenCalledWith(3);
  });

  it('should inactivate a harvest after confirmation', () => {
    setupSelectedFarm('PRODUCER');
    const component = fixture.componentInstance as unknown as HarvestsPage & {
      requestInactivate(harvest: HarvestSeason): void;
      confirmInactivate(): void;
    };

    component.requestInactivate(seasons[0]);
    component.confirmInactivate();

    expect(harvestService.inactivate).toHaveBeenCalledWith(1);
  });

  function setupSelectedFarm(role: 'PRODUCER' | 'EMPLOYEE' | 'ACCOUNTANT'): void {
    sessionStore.setUser(user('USER'));
    selectedFarmStore.setFarms([farm]);
    farmAccessStore.setAccess({
      farmId: 10,
      farmName: 'Fazenda Boa Safra',
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

    fixture = TestBed.createComponent(HarvestsPage);
    fixture.detectChanges();
  }

  function user(userType: 'ADMIN' | 'USER') {
    return {
      id: 1,
      name: 'Ana Silva',
      email: 'ana@example.com',
      document: null,
      userType,
      status: 'ACTIVE',
    };
  }

  function clickButton(label: string): void {
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (item) => item.textContent?.trim() === label,
    );

    button?.click();
    fixture.detectChanges();
  }

  function text(): string {
    fixture.detectChanges();
    return fixture.nativeElement.textContent ?? '';
  }
});
