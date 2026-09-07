import { Directive, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseChartDirective } from 'ng2-charts';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import {
  HarvestCategoryComparison,
  HarvestCategoryMovements,
} from '../../../../core/models/harvest-season.models';
import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import { HarvestSeasonService } from '../../../../core/services/harvest-season.service';
import { HarvestCategoryAnalysis } from './harvest-category-movements';

@Directive({ selector: 'canvas[baseChart]' })
class BaseChartStubDirective {
  readonly type = input();
  readonly data = input();
  readonly options = input();
}

const movements: HarvestCategoryMovements = {
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

const comparison: HarvestCategoryComparison = {
  expenses: {
    plannedTotal: 35000,
    realizedTotal: 34000,
    difference: -1000,
    categories: [
      {
        categoryId: 1,
        categoryName: 'Fertilizantes',
        planned: true,
        plannedAmount: 25000,
        realizedAmount: 26000,
        difference: 1000,
        percentageDifference: 4,
        status: 'ABOVE_PLAN',
        semantic: 'WORSE',
      },
      {
        categoryId: 3,
        categoryName: 'Combustível',
        planned: false,
        plannedAmount: null,
        realizedAmount: 8000,
        difference: 8000,
        percentageDifference: null,
        status: 'UNPLANNED',
        semantic: 'WORSE',
      },
      {
        categoryId: null,
        categoryName: 'Sem categoria',
        planned: true,
        plannedAmount: 2000,
        realizedAmount: 0,
        difference: -2000,
        percentageDifference: -100,
        status: 'NO_MOVEMENT',
        semantic: 'NEUTRAL',
      },
    ],
  },
  incomes: {
    plannedTotal: 20000,
    realizedTotal: 23000,
    difference: 3000,
    categories: [
      {
        categoryId: 2,
        categoryName: 'Venda de soja',
        planned: true,
        plannedAmount: 20000,
        realizedAmount: 15000,
        difference: -5000,
        percentageDifference: -25,
        status: 'BELOW_PLAN',
        semantic: 'WORSE',
      },
      {
        categoryId: 4,
        categoryName: 'Bônus',
        planned: false,
        plannedAmount: null,
        realizedAmount: 8000,
        difference: 8000,
        percentageDifference: null,
        status: 'UNPLANNED',
        semantic: 'BETTER',
      },
    ],
  },
};

interface ComponentTestApi {
  chartData: () => { datasets: { data: unknown[] }[] };
  chartOptions: () => { indexAxis?: 'x' | 'y'; plugins?: { legend?: { display?: boolean } } };
}

describe('HarvestCategoryAnalysis', () => {
  let service: {
    getCategoryBreakdown: ReturnType<typeof vi.fn>;
    getCategoryComparison: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    service = {
      getCategoryBreakdown: vi.fn(() => of(movements)),
      getCategoryComparison: vi.fn(() => of(comparison)),
    };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('starts with movements, expenses and chart without loading the comparison', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as ComponentTestApi;

    expect(text(fixture)).toContain('Análise por categoria');
    expect(button(fixture, 'Movimentações').getAttribute('aria-pressed')).toBe('true');
    expect(button(fixture, 'Despesas').getAttribute('aria-pressed')).toBe('true');
    expect(button(fixture, 'Gráfico').getAttribute('aria-pressed')).toBe('true');
    expect(service.getCategoryBreakdown).toHaveBeenCalledWith(25);
    expect(service.getCategoryComparison).not.toHaveBeenCalled();
    expect(component.chartOptions().indexAxis).toBe('y');
    expect(component.chartData().datasets[0].data).toEqual([1000, 250]);
  });

  it('loads and caches the comparison while preserving type and view state independently', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as ComponentTestApi;

    button(fixture, 'Planejado x realizado').click();
    fixture.detectChanges();

    expect(service.getCategoryComparison).toHaveBeenCalledOnce();
    expect(button(fixture, 'Planejado x realizado').getAttribute('aria-pressed')).toBe('true');
    expect(button(fixture, 'Despesas').getAttribute('aria-pressed')).toBe('true');
    expect(button(fixture, 'Gráfico').getAttribute('aria-pressed')).toBe('true');
    expect(component.chartData().datasets).toHaveLength(2);
    expect(component.chartData().datasets[0].data).toEqual([25000, null, 2000]);
    expect(component.chartData().datasets[1].data).toEqual([26000, 8000, 0]);
    expect(component.chartOptions().plugins?.legend?.display).toBe(true);

    button(fixture, 'Receitas').click();
    button(fixture, 'Lista').click();
    fixture.detectChanges();

    expect(text(fixture)).toContain('Venda de soja');
    expect(text(fixture)).toContain('Bônus');
    expect(text(fixture)).toContain('Não planejado');
    expect(button(fixture, 'Lista').getAttribute('aria-pressed')).toBe('true');
    expect(service.getCategoryComparison).toHaveBeenCalledOnce();

    button(fixture, 'Movimentações').click();
    fixture.detectChanges();
    expect(button(fixture, 'Receitas').getAttribute('aria-pressed')).toBe('true');
    expect(button(fixture, 'Lista').getAttribute('aria-pressed')).toBe('true');

    button(fixture, 'Planejado x realizado').click();
    fixture.detectChanges();
    expect(service.getCategoryComparison).toHaveBeenCalledOnce();
  });

  it('renders comparison statuses from the backend in the detailed list', async () => {
    const fixture = await createComponent();
    button(fixture, 'Planejado x realizado').click();
    button(fixture, 'Lista').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-label="Lista de planejado x realizado por categoria"]')).not.toBeNull();
    expect(text(fixture)).toContain('R$ 35.000,00');
    expect(text(fixture)).toContain('Sem movimentação');
    expect(text(fixture)).toContain('Combustível');
  });

  it('renders local loading and error states for the lazy comparison', async () => {
    const pending = new Subject<HarvestCategoryComparison>();
    service.getCategoryComparison.mockReturnValue(pending);
    const fixture = await createComponent();
    button(fixture, 'Planejado x realizado').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-label="Carregando comparativo por categoria"]')).not.toBeNull();

    pending.error(new Error('failure'));
    fixture.detectChanges();
    expect(text(fixture)).toContain('Não foi possível carregar o comparativo por categoria.');
  });

  async function createComponent(): Promise<ComponentFixture<HarvestCategoryAnalysis>> {
    await TestBed.configureTestingModule({
      imports: [HarvestCategoryAnalysis],
      providers: [provideGestaoDiretaIcons(), { provide: HarvestSeasonService, useValue: service }],
    })
      .overrideComponent(HarvestCategoryAnalysis, {
        remove: { imports: [BaseChartDirective] },
        add: { imports: [BaseChartStubDirective] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(HarvestCategoryAnalysis);
    fixture.componentRef.setInput('harvestSeasonId', 25);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function button(fixture: ComponentFixture<HarvestCategoryAnalysis>, label: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (element: HTMLButtonElement) => element.textContent?.trim() === label,
    ) as HTMLButtonElement;
  }

  function text(fixture: ComponentFixture<HarvestCategoryAnalysis>): string {
    return fixture.nativeElement.textContent ?? '';
  }
});
