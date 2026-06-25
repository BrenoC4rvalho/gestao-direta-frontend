import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { Farm } from '../../core/models/farm.models';
import { PageResponse } from '../../core/models/page-response.model';
import { FarmService } from '../../core/services/farm.service';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { ToastStore } from '../../core/stores/toast.store';

import { FarmsPage } from './farms-page';

const farms: Farm[] = [
  {
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
  },
  {
    id: 2,
    name: 'Sítio Santa Clara',
    document: null,
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
  let farmService: { list: ReturnType<typeof vi.fn> };
  let selectedFarmStore: SelectedFarmStore;
  let toastStore: ToastStore;

  beforeEach(async () => {
    farmService = {
      list: vi.fn().mockReturnValue(of(pageResponse(farms))),
    };

    await TestBed.configureTestingModule({
      imports: [FarmsPage],
      providers: [
        provideGestaoDiretaIcons(),
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

  function createPage(): void {
    fixture = TestBed.createComponent(FarmsPage);
    fixture.detectChanges();
  }

  it('should render title, load farms and render cards', () => {
    createPage();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Fazendas');
    expect(text).toContain('Fazenda Boa Safra');
    expect(text).toContain('Sítio Santa Clara');
    expect(farmService.list).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ASC',
    });
  });

  it('should show card skeletons while loading', () => {
    const request = new Subject<PageResponse<Farm>>();
    farmService.list.mockReturnValueOnce(request);

    createPage();

    expect(
      fixture.nativeElement.querySelector('[aria-label="Carregando fazendas"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('gd-skeleton').length).toBeGreaterThan(0);

    request.complete();
  });

  it('should render the empty state', () => {
    farmService.list.mockReturnValueOnce(of(pageResponse([])));
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Nenhuma fazenda encontrada');
  });

  it('should render error state and retry loading', () => {
    farmService.list
      .mockReturnValueOnce(throwError(() => new Error('failed')))
      .mockReturnValueOnce(of(pageResponse(farms)));
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar as fazendas');

    const retryButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Tentar novamente'));
    retryButton?.click();
    fixture.detectChanges();

    expect(farmService.list).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Fazenda Boa Safra');
  });

  it('should select a farm, highlight it and show success feedback', () => {
    const selectFarm = vi.spyOn(selectedFarmStore, 'selectFarm');
    createPage();

    const selectButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.trim() === 'Selecionar');
    selectButton?.click();
    fixture.detectChanges();

    expect(selectFarm).toHaveBeenCalledWith(farms[0]);
    expect(
      fixture.nativeElement.querySelector('article[data-selected="true"]'),
    ).toBeTruthy();
    expect(toastStore.toasts()[0]?.title).toBe('Fazenda selecionada.');
  });

  it('should load next and previous pages', () => {
    farmService.list
      .mockReturnValueOnce(of(pageResponse([farms[0]], 0, 2)))
      .mockReturnValueOnce(of(pageResponse([farms[1]], 1, 2)))
      .mockReturnValueOnce(of(pageResponse([farms[0]], 0, 2)));
    createPage();

    clickButton('Próxima');
    expect(farmService.list).toHaveBeenLastCalledWith({
      page: 1,
      size: 10,
      sort: 'name',
      direction: 'ASC',
    });

    fixture.detectChanges();
    clickButton('Anterior');
    expect(farmService.list).toHaveBeenLastCalledWith({
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ASC',
    });
  });

  function clickButton(label: string): void {
    const button = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((item) => item.textContent?.includes(label));
    button?.click();
    fixture.detectChanges();
  }
});
