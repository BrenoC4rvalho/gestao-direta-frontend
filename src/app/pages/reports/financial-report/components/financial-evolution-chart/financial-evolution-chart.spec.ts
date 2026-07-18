import { Directive, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseChartDirective } from 'ng2-charts';

import { ThemeStore } from '../../../../../core/stores/theme.store';
import { FinancialEvolutionPoint } from '../../../../../core/models/financial-report.models';

import { FinancialEvolutionChart } from './financial-evolution-chart';

@Directive({ selector: 'canvas[baseChart]' })
class BaseChartStubDirective {
  readonly type = input();
  readonly data = input();
  readonly options = input();
}

const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const points: readonly FinancialEvolutionPoint[] = labels.map((label, index) => ({
  period: `2026-${String(index + 1).padStart(2, '0')}`,
  label,
  periodStart: `2026-${String(index + 1).padStart(2, '0')}-01`,
  periodEnd: `2026-${String(index + 1).padStart(2, '0')}-28`,
  income: (index + 5) * 1000,
  expense: (index + 2) * 1000,
  netBalance: index === 1 ? -2000 : (index + 3) * 1000,
  transactionCount: index + 1,
}));

interface TestApi {
  chartType: 'bar';
  chartData: () => {
    labels?: unknown[];
    datasets: { type?: string; label?: string; data: unknown[] }[];
  };
  chartOptions: () => {
    plugins?: {
      legend?: { position?: string };
      tooltip?: {
        backgroundColor?: string;
        callbacks?: {
          label?: (context: {
            dataset: { label?: string };
            parsed: { y: number };
          }) => string | string[] | void;
        };
      };
    };
    scales?: {
      y?: {
        min?: number;
        grid?: {
          color?: (context: { tick: { value: number } }) => string;
          lineWidth?: (context: { tick: { value: number } }) => number;
        };
        ticks?: { callback?: (value: number) => string | string[] };
      };
    };
  };
  selectPeriod: (event: { active?: object[] }) => void;
}

async function createComponent(): Promise<ComponentFixture<FinancialEvolutionChart>> {
  await TestBed.configureTestingModule({ imports: [FinancialEvolutionChart] })
    .overrideComponent(FinancialEvolutionChart, {
      remove: { imports: [BaseChartDirective] },
      add: { imports: [BaseChartStubDirective] },
    })
    .compileComponents();

  const fixture = TestBed.createComponent(FinancialEvolutionChart);
  fixture.componentRef.setInput('points', points);
  fixture.detectChanges();
  return fixture;
}

describe('FinancialEvolutionChart', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('maps Jan–Dez into grouped income and expense bars with a net balance line', async () => {
    const component = (await createComponent()).componentInstance as unknown as TestApi;
    const chartData = component.chartData();

    expect(component.chartType).toBe('bar');
    expect(chartData.labels).toEqual(labels);
    expect(chartData.datasets.map(({ type, label }) => ({ type, label }))).toEqual([
      { type: 'bar', label: 'Receitas' },
      { type: 'bar', label: 'Despesas' },
      { type: 'line', label: 'Saldo líquido' },
    ]);
    expect(chartData.datasets[0].data).toEqual(points.map((point) => point.income));
    expect(chartData.datasets[1].data).toEqual(points.map((point) => -Math.abs(point.expense)));
    expect(chartData.datasets[2].data).toEqual(points.map((point) => point.netBalance));
    expect(points[1].expense).toBe(3000);
  });

  it('uses a bottom legend and automatic scale with an emphasized zero grid line', async () => {
    const component = (await createComponent()).componentInstance as unknown as TestApi;
    const options = component.chartOptions();
    const grid = options.scales?.y?.grid;

    expect(options.plugins?.legend?.position).toBe('bottom');
    expect(options.scales?.y?.min).toBeUndefined();
    expect(grid?.lineWidth?.({ tick: { value: 0 } })).toBeGreaterThan(
      grid?.lineWidth?.({ tick: { value: 1 } }) ?? 0,
    );
    expect(grid?.color?.({ tick: { value: 0 } })).not.toBe(grid?.color?.({ tick: { value: 1 } }));
  });

  it('updates chart colors for light and dark themes', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as TestApi;
    const themeStore = TestBed.inject(ThemeStore);

    expect(component.chartOptions().plugins?.tooltip?.backgroundColor).toBe('#FFFFFF');
    themeStore.setTheme('dark');
    fixture.detectChanges();
    expect(component.chartOptions().plugins?.tooltip?.backgroundColor).toBe('#16231D');
  });

  it('formats expenses as positive values and preserves negative balances in tooltips', async () => {
    const component = (await createComponent()).componentInstance as unknown as TestApi;
    const tooltip = component.chartOptions().plugins?.tooltip?.callbacks?.label;

    expect(tooltip?.({ dataset: { label: 'Despesas' }, parsed: { y: -20000 } })).toContain(
      'R$ 20.000,00',
    );
    expect(tooltip?.({ dataset: { label: 'Saldo líquido' }, parsed: { y: -2000 } })).toContain(
      '-R$ 2.000,00',
    );
    expect(component.chartOptions().scales?.y?.ticks?.callback?.(-20000)).toBe('-R$ 20 mil');
  });

  it('emits the original period for clicks on every dataset index', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as TestApi;
    const emitted: FinancialEvolutionPoint[] = [];
    fixture.componentInstance.periodSelected.subscribe((point) => emitted.push(point));

    component.selectPeriod({ active: [{ index: 1, datasetIndex: 0 }] });
    component.selectPeriod({ active: [{ index: 1, datasetIndex: 1 }] });
    component.selectPeriod({ active: [{ index: 1, datasetIndex: 2 }] });

    expect(emitted).toEqual([points[1], points[1], points[1]]);
  });
});
