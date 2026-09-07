import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import {
  HarvestSeason,
  HarvestSeasonComparison,
} from '../../../../core/models/harvest-season.models';
import { PageResponse } from '../../../../core/models/page-response.model';
import { HarvestSeasonService } from '../../../../core/services/harvest-season.service';

import { HarvestComparisonDrawer } from './harvest-comparison-drawer';

const seasons: readonly HarvestSeason[] = [
  {
    id: 1,
    farmId: 10,
    productionActivityId: 1,
    productionActivityName: 'Café',
    name: 'Café 2025/2026',
    startDate: '2025-10-01',
    endDate: '2026-09-30',
    areaHectares: 48,
    status: 'FINISHED',
  },
  {
    id: 2,
    farmId: 10,
    productionActivityId: 1,
    productionActivityName: 'Café',
    name: 'Café 2026/2027',
    startDate: '2026-10-01',
    endDate: null,
    areaHectares: null,
    status: 'IN_PROGRESS',
  },
];

const comparison: HarvestSeasonComparison = {
  harvestA: {
    id: 1,
    name: 'Café 2025/2026',
    status: 'FINISHED',
    productionActivityName: 'Café',
    startDate: '2025-10-01',
    endDate: '2026-09-30',
    areaHectares: 48,
    planning: {
      plannedCost: 182000,
      plannedRevenue: 238000,
      plannedProfit: 56000,
      plannedMargin: 23.53,
    },
    projection: {
      projectedCost: 190000,
      projectedRevenue: 247000,
      projectedProfit: 57000,
      projectedMargin: 23.08,
    },
    realized: {
      realizedCost: 103950,
      realizedRevenue: 152000,
      realizedProfit: 48050,
      realizedMargin: 31.61,
    },
    perHectare: {
      plannedCostPerHectare: 3791.67,
      plannedRevenuePerHectare: 4958.33,
      plannedResultPerHectare: 1166.67,
      projectedCostPerHectare: 3958.33,
      projectedRevenuePerHectare: 5145.83,
      projectedProfitPerHectare: 1187.5,
      realizedCostPerHectare: 2165.63,
      realizedRevenuePerHectare: 3166.67,
      realizedProfitPerHectare: 1001.04,
    },
  },
  harvestB: {
    id: 2,
    name: 'Café 2026/2027',
    status: 'IN_PROGRESS',
    productionActivityName: 'Café',
    startDate: '2026-10-01',
    endDate: null,
    areaHectares: null,
    planning: null,
    projection: null,
    realized: null,
    perHectare: {
      plannedCostPerHectare: null,
      plannedRevenuePerHectare: null,
      plannedResultPerHectare: null,
      projectedCostPerHectare: null,
      projectedRevenuePerHectare: null,
      projectedProfitPerHectare: null,
      realizedCostPerHectare: null,
      realizedRevenuePerHectare: null,
      realizedProfitPerHectare: null,
    },
  },
  differences: [],
  highlights: [],
};

interface DrawerControls {
  harvestAControl: FormControl<number | null>;
  harvestBControl: FormControl<number | null>;
}

function pageResponse(content: readonly HarvestSeason[]): PageResponse<HarvestSeason> {
  return {
    content: [...content],
    page: 0,
    size: 100,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
  };
}

function normalizedText(element: Element): string {
  return (element.textContent ?? '').replace(/\s+/g, ' ').trim();
}

async function createComponent(compareResult = of(comparison)): Promise<{
  fixture: ComponentFixture<HarvestComparisonDrawer>;
  service: { list: ReturnType<typeof vi.fn>; compareHarvestSeasons: ReturnType<typeof vi.fn> };
}> {
  const service = {
    list: vi.fn(() => of(pageResponse(seasons))),
    compareHarvestSeasons: vi.fn(() => compareResult),
  };

  await TestBed.configureTestingModule({
    imports: [HarvestComparisonDrawer],
    providers: [
      provideGestaoDiretaIcons(),
      { provide: HarvestSeasonService, useValue: service },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(HarvestComparisonDrawer);
  fixture.componentRef.setInput('farmId', 10);
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();

  return { fixture, service };
}

function selectHarvests(fixture: ComponentFixture<HarvestComparisonDrawer>): void {
  const controls = fixture.componentInstance as unknown as DrawerControls;
  controls.harvestAControl.setValue(1);
  controls.harvestBControl.setValue(2);
  fixture.detectChanges();
}

describe('HarvestComparisonDrawer', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.classList.remove('gd-overlay-open');
  });

  it('should show an empty state until two Harvest Seasons are selected', async () => {
    const { fixture } = await createComponent();

    expect(normalizedText(fixture.nativeElement)).toContain('Selecione duas Safras');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('should render a single matrix with one column for each selected Harvest Season', async () => {
    const { fixture, service } = await createComponent();
    selectHarvests(fixture);

    const table = fixture.nativeElement.querySelector('table') as HTMLTableElement;
    const headers = Array.from(table.querySelectorAll('thead th')).map(normalizedText);
    const text = normalizedText(table);
    const drawerText = normalizedText(fixture.nativeElement);
    const plannedCostRow = Array.from(table.querySelectorAll('tbody tr')).find((row) =>
      normalizedText(row).includes('Custo planejado'),
    ) as HTMLTableRowElement;

    expect(service.compareHarvestSeasons).toHaveBeenCalledWith(10, 1, 2);
    expect(headers).toEqual(['Indicador', 'Safra A', 'Safra B']);
    expect(text).toContain('Planejamento');
    expect(text).toContain('Projeção');
    expect(text).toContain('Realizado');
    expect(text).toContain('Indicadores por hectare');
    expect(drawerText).toContain('Finalizada');
    expect(drawerText).toContain('Em andamento');
    expect(drawerText).toContain('Duração');
    expect(drawerText).toContain('12 meses');
    expect(text).toContain('103.950,00');
    expect(normalizedText(plannedCostRow)).toContain('—');
    expect(text).not.toContain('Principais diferenças');
    expect(text).not.toContain('Diferença');
  });

  it('should show a matrix-shaped loading state while the comparison is requested', async () => {
    const comparisonSubject = new Subject<HarvestSeasonComparison>();
    const { fixture } = await createComponent(comparisonSubject.asObservable());
    selectHarvests(fixture);

    const loading = fixture.nativeElement.querySelector('[aria-label="Carregando comparação"]') as HTMLElement;

    expect(loading).not.toBeNull();
    expect(loading.querySelectorAll('gd-skeleton').length).toBe(2);
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('should preserve the selected Harvest Seasons and offer retry after a comparison error', async () => {
    const { fixture, service } = await createComponent(throwError(() => new Error('comparison failed')));
    selectHarvests(fixture);

    expect(normalizedText(fixture.nativeElement)).toContain('Erro ao comparar Safras');

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const retryButton = Array.from(buttons).find(
      (button) => normalizedText(button) === 'Tentar novamente',
    ) as HTMLButtonElement;
    retryButton.click();

    expect(service.compareHarvestSeasons).toHaveBeenCalledTimes(2);
  });
});
