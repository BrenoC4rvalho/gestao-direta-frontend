import { Directive, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseChartDirective } from 'ng2-charts';

import { CashFlowPoint } from '../../../../core/models/financial.models';

import { CashFlowChartComponent } from './cash-flow-chart.component';

@Directive({
  selector: 'canvas[baseChart]',
})
class BaseChartStubDirective {
  readonly type = input();
  readonly data = input();
  readonly options = input();
}

const points: readonly CashFlowPoint[] = [
  { month: 1, label: 'Jan', income: 12000, expense: 2000, netFlow: 10000, balance: 45000 },
  { month: 2, label: 'Fev', income: 8000, expense: 3000, netFlow: 5000, balance: 50000 },
];

interface CashFlowChartComponentTestApi {
  chartType: 'line';
  chartData: () => { labels?: unknown[]; datasets: { data: unknown[] }[] };
  chartOptions: () => {
    plugins?: { legend?: { display?: boolean }; tooltip?: { callbacks?: { label?: (context: { dataIndex: number; parsed: { y: number } }) => string | string[] | void } } };
    scales?: { y?: { ticks?: { callback?: (value: number) => string | string[] } } };
  };
}

async function createComponent(
  data: readonly CashFlowPoint[] = points,
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

  it('maps response labels and balances to the line chart configuration', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as CashFlowChartComponentTestApi;
    const chartData = component.chartData();

    expect(component.chartType).toBe('line');
    expect(chartData.labels).toEqual(points.map((point) => point.label));
    expect(chartData.datasets[0].data).toEqual(points.map((point) => point.balance));
    expect(component.chartOptions().plugins?.legend?.display).toBe(false);
  });

  it('renders the canvas and accessible balance values', async () => {
    const fixture = await createComponent();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('canvas')).not.toBeNull();
    expect(root.querySelector('ul')?.textContent).toContain('Janeiro:');
    expect(root.querySelector('ul')?.textContent).toContain('45.000,00');
    expect(root.querySelector('.relative')?.className).toContain('h-64');
  });

  it('formats tooltip details and vertical-axis values as Brazilian currency', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as CashFlowChartComponentTestApi;
    const options = component.chartOptions();

    const tooltip = options.plugins?.tooltip?.callbacks?.label?.({ dataIndex: 0, parsed: { y: 45000 } });

    expect(tooltip).toEqual(expect.arrayContaining([
      expect.stringContaining('Saldo:'),
      expect.stringContaining('Entradas:'),
      expect.stringContaining('Saídas:'),
      expect.stringContaining('Fluxo líquido:'),
    ]));
    expect(tooltip).toEqual(expect.arrayContaining([expect.stringContaining('45.000,00')]));
    expect(options.scales?.y?.ticks?.callback?.(75000)).toContain('75k');
    expect(options.scales?.y?.ticks?.callback?.(-25000)).toContain('25k');
  });
});
