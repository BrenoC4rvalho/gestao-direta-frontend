import { Directive, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseChartDirective } from 'ng2-charts';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { HarvestCategoryMovements as HarvestCategoryMovementsResponse } from '../../../../core/models/harvest-season.models';
import { HarvestSeasonService } from '../../../../core/services/harvest-season.service';
import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import { HarvestCategoryMovements } from './harvest-category-movements';

@Directive({ selector: 'canvas[baseChart]' })
class BaseChartStubDirective {
  readonly type = input();
  readonly data = input();
  readonly options = input();
}

const movements: HarvestCategoryMovementsResponse = {
  expenses: {
    total: 1250,
    categories: [
      { categoryId: 1, categoryName: 'Fertilizantes', amount: 1000, percentage: 80 },
      { categoryId: null, categoryName: 'Sem categoria', amount: 250, percentage: 20 },
    ],
  },
  incomes: {
    total: 2200,
    categories: [{ categoryId: 2, categoryName: 'Venda de soja', amount: 2200, percentage: 100 }],
  },
};

interface ComponentTestApi {
  chartType: 'bar';
  chartData: () => { labels?: unknown[]; datasets: { data: unknown[] }[] };
  chartOptions: () => { indexAxis?: 'x' | 'y' };
}

describe('HarvestCategoryMovements', () => {
  let service: { getCategoryBreakdown: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    service = { getCategoryBreakdown: vi.fn(() => of(movements)) };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('loads expenses first and maps backend values to a horizontal chart and accessible list', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as ComponentTestApi;

    expect(service.getCategoryBreakdown).toHaveBeenCalledWith(25);
    expect(text(fixture)).toContain('Despesas por categoria');
    expect(text(fixture)).toContain('R$ 1.250,00');
    expect(text(fixture)).toContain('Fertilizantes');
    expect(text(fixture)).toContain('Sem categoria');
    expect(text(fixture)).toContain('80,00%');
    expect(component.chartType).toBe('bar');
    expect(component.chartOptions().indexAxis).toBe('y');
    expect(component.chartData().datasets[0].data).toEqual([1000, 250]);
    expect(fixture.nativeElement.querySelector('canvas')).not.toBeNull();
  });

  it('switches to incomes without another request', async () => {
    const fixture = await createComponent();

    button(fixture, 'Receitas').click();
    fixture.detectChanges();

    expect(service.getCategoryBreakdown).toHaveBeenCalledOnce();
    expect(text(fixture)).toContain('Receitas por categoria');
    expect(text(fixture)).toContain('R$ 2.200,00');
    expect(text(fixture)).toContain('Venda de soja');
    expect(button(fixture, 'Receitas').getAttribute('aria-pressed')).toBe('true');
  });

  it('renders loading, empty and error states locally', async () => {
    const pending = new Subject<HarvestCategoryMovementsResponse>();
    service.getCategoryBreakdown.mockReturnValue(pending);
    const loadingFixture = await createComponent();

    expect(
      loadingFixture.nativeElement
        .querySelector('[aria-label="Carregando movimentações por categoria"]')
        ?.getAttribute('aria-label'),
    ).toBe('Carregando movimentações por categoria');

    pending.next({
      expenses: { total: 0, categories: [] },
      incomes: { total: 0, categories: [] },
    });
    pending.complete();
    loadingFixture.detectChanges();
    expect(text(loadingFixture)).toContain('Nenhuma despesa realizada.');

    TestBed.resetTestingModule();
    service = { getCategoryBreakdown: vi.fn(() => throwError(() => new Error('failure'))) };
    const errorFixture = await createComponent();
    expect(text(errorFixture)).toContain(
      'Não foi possível carregar as movimentações por categoria.',
    );
  });

  async function createComponent(): Promise<ComponentFixture<HarvestCategoryMovements>> {
    await TestBed.configureTestingModule({
      imports: [HarvestCategoryMovements],
      providers: [provideGestaoDiretaIcons(), { provide: HarvestSeasonService, useValue: service }],
    })
      .overrideComponent(HarvestCategoryMovements, {
        remove: { imports: [BaseChartDirective] },
        add: { imports: [BaseChartStubDirective] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(HarvestCategoryMovements);
    fixture.componentRef.setInput('harvestSeasonId', 25);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function button(
    fixture: ComponentFixture<HarvestCategoryMovements>,
    label: string,
  ): HTMLButtonElement {
    return Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find(
      (element: HTMLButtonElement) => element.textContent?.trim() === label,
    ) as HTMLButtonElement;
  }

  function text(fixture: ComponentFixture<HarvestCategoryMovements>): string {
    return fixture.nativeElement.textContent ?? '';
  }
});
