import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { Farm } from '../../core/models/farm.models';
import { PageResponse } from '../../core/models/page-response.model';
import { AuthService } from '../../core/services/auth.service';
import { FarmService } from '../../core/services/farm.service';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { ToastStore } from '../../core/stores/toast.store';

import { AppLayout } from './app-layout';

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
  updatedAt: '2026-01-01T00:00:00Z',
};

function pageResponse(content: Farm[]): PageResponse<Farm> {
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

describe('AppLayout', () => {
  let farmService: { list: ReturnType<typeof vi.fn> };
  let selectedFarmStore: SelectedFarmStore;
  let toastStore: ToastStore;

  beforeEach(async () => {
    farmService = {
      list: vi.fn().mockReturnValue(of(pageResponse([farm]))),
    };

    await TestBed.configureTestingModule({
      imports: [AppLayout],
      providers: [
        provideGestaoDiretaIcons(),
        provideRouter([]),
        { provide: AuthService, useValue: { logout: vi.fn().mockReturnValue(of(undefined)) } },
        { provide: FarmService, useValue: farmService },
      ],
    }).compileComponents();

    selectedFarmStore = TestBed.inject(SelectedFarmStore);
    toastStore = TestBed.inject(ToastStore);
    selectedFarmStore.clear();
    toastStore.clear();
  });

  afterEach(() => {
    selectedFarmStore.clear();
    toastStore.clear();
  });

  it('should render navigation layout and router outlet', () => {
    const fixture = TestBed.createComponent(AppLayout);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('gd-desktop-sidebar')).toBeTruthy();
    expect(element.querySelector('gd-mobile-header')).toBeTruthy();
    expect(element.querySelector('router-outlet')).toBeTruthy();
  });

  it('should load farms on init and select the first farm', () => {
    const fixture = TestBed.createComponent(AppLayout);
    fixture.detectChanges();

    expect(farmService.list).toHaveBeenCalledWith({
      page: 0,
      size: 100,
      sort: 'name',
      direction: 'ASC',
    });
    expect(selectedFarmStore.farms()).toEqual([farm]);
    expect(selectedFarmStore.selectedFarm()).toEqual(farm);
    expect(selectedFarmStore.loading()).toBe(false);
  });

  it('should not break when the farm list is empty', () => {
    farmService.list.mockReturnValueOnce(of(pageResponse([])));

    const fixture = TestBed.createComponent(AppLayout);
    fixture.detectChanges();

    expect(selectedFarmStore.farms()).toEqual([]);
    expect(selectedFarmStore.selectedFarm()).toBeNull();
    expect(selectedFarmStore.loaded()).toBe(true);
    expect(fixture.nativeElement.querySelector('gd-desktop-sidebar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('gd-mobile-header')).toBeTruthy();
  });

  it('should store error and show toast when farm loading fails', () => {
    farmService.list.mockReturnValueOnce(throwError(() => new Error('Falha')));

    const fixture = TestBed.createComponent(AppLayout);
    fixture.detectChanges();

    expect(selectedFarmStore.error()).toBe('Não foi possível carregar suas fazendas.');
    expect(selectedFarmStore.loading()).toBe(false);
    expect(toastStore.toasts()[0]?.title).toBe('Não foi possível carregar suas fazendas.');
  });

  it('should not reload farms when they are already loaded', () => {
    selectedFarmStore.setFarms([farm]);

    const fixture = TestBed.createComponent(AppLayout);
    fixture.detectChanges();

    expect(farmService.list).not.toHaveBeenCalled();
    expect(selectedFarmStore.selectedFarm()).toEqual(farm);
  });
});
