import { Directive, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseChartDirective } from 'ng2-charts';

import { CASH_FLOW_CHART_MOCK } from '../../mocks/cash-flow-chart.mock';

import { CashFlowChartComponent } from './cash-flow-chart.component';

@Directive({
  selector: 'canvas[baseChart]',
})
class BaseChartStubDirective {
  readonly type = input();
  readonly data = input();
  readonly options = input();
}

interface CashFlowChartComponentTestApi {
  chartType: 'line';
  chartData: () => { labels?: unknown[]; datasets: { data: unknown[] }[] };
  chartOptions: () => {
    plugins?: { legend?: { display?: boolean }; tooltip?: { callbacks?: { label?: (context: { parsed: { y: number } }) => string } } };
    scales?: { y?: { ticks?: { callback?: (value: number) => string | string[] } } };
  };
}

async function createComponent(
  data: readonly typeof CASH_FLOW_CHART_MOCK[number][] = CASH_FLOW_CHART_MOCK,
): Promise<ComponentFixture<CashFlowChartComponent>> {
  await TestBed.configureTestingModule({
    imports: [CashFlowChartComponent],
  })
    .overrideComponent(CashFlowChartComponent, {
      remove: { imports: [BaseChartDirective] },
      add: { imports: [BaseChartStubDirective] },
    })
    .compileComponents();

  const fixture = TestBed.createComponent(CashFlowChartComponent);
  fixture.componentRef.setInput('data', data);
  fixture.detectChanges();

  return fixture;
}

describe('CashFlowChartComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders the title, subtitle, accessible values, and full-width container', async () => {
    const fixture = await createComponent();
    const root = fixture.nativeElement as HTMLElement;
    const text = root.textContent ?? '';

    expect(text).toContain('Fluxo de Caixa');
    expect(text).toContain('Saldo projetado ao longo do ano');
    expect(root.querySelector('ul')?.textContent).toContain('Janeiro: R$ 45.000,00');
    expect(root.querySelector('gd-card')?.className).toContain('w-full');
    expect(root.querySelector('.relative')?.className).toContain('h-64');
  });

  it('maps the mock data to the line chart configuration', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as CashFlowChartComponentTestApi;
    const chartData = component.chartData();

    expect(component.chartType).toBe('line');
    expect(chartData.labels).toEqual(CASH_FLOW_CHART_MOCK.map((point) => point.label));
    expect(chartData.datasets[0].data).toEqual(CASH_FLOW_CHART_MOCK.map((point) => point.value));
    expect(chartData.datasets[0].data).toHaveLength(12);
    expect(component.chartOptions().plugins?.legend?.display).toBe(false);
  });

  it('formats tooltip and vertical-axis values as Brazilian currency', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as CashFlowChartComponentTestApi;
    const options = component.chartOptions();

    expect(options.plugins?.tooltip?.callbacks?.label?.({ parsed: { y: 61000 } })).toBe(
      'Saldo: R$ 61.000,00',
    );
    expect(options.scales?.y?.ticks?.callback?.(75000)).toBe('R$ 75k');
    expect(options.scales?.y?.ticks?.callback?.(-25000)).toBe('-R$ 25k');
    expect(options.scales?.y?.ticks?.callback?.(0)).toBe('R$ 0');
  });

  it('shows the empty state without rendering a canvas', async () => {
    const fixture = await createComponent([]);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toContain('Nenhum dado de fluxo de caixa disponível.');
    expect(root.querySelector('canvas')).toBeNull();
  });
});
