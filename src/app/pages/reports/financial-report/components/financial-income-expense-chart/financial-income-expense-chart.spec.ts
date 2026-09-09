import { Directive, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseChartDirective } from 'ng2-charts';

import {
  FinancialCumulativeEvolutionPoint,
} from '../../../../../core/models/financial-report.models';
import { ThemeStore } from '../../../../../core/stores/theme.store';

import { FinancialIncomeExpenseChart } from './financial-income-expense-chart';

@Directive({ selector: 'canvas[baseChart]' })
class BaseChartStubDirective {
  readonly type = input();
  readonly data = input();
  readonly options = input();
}

const points: readonly FinancialCumulativeEvolutionPoint[] = [
  {
    period: '2026-01',
    label: 'Jan',
    periodStart: '2026-01-15',
    periodEnd: '2026-01-31',
    cumulativeIncome: 100000,
    cumulativeExpense: 80000,
  },
  {
    period: '2026-02',
    label: 'Fev',
    periodStart: '2026-02-01',
    periodEnd: '2026-02-28',
    cumulativeIncome: 220000,
    cumulativeExpense: 170000,
  },
];

interface TestApi {
  chartType: 'line';
  hasData: () => boolean;
  chartData: () => {
    labels?: unknown[];
    datasets: {
      label?: string;
      data: unknown[];
      borderColor?: string;
      borderWidth?: number;
      tension?: number;
      fill?: boolean;
      pointRadius?: number;
      pointHoverRadius?: number;
    }[];
  };
  chartOptions: () => {
    plugins?: {
      legend?: { display?: boolean };
      tooltip?: {
        backgroundColor?: string;
        callbacks?: {
          title?: (items: { dataIndex: number }[]) => string | string[] | void;
          label?: (item: {
            dataset: { label?: string };
            parsed: { y: number };
          }) => string | string[] | void;
        };
      };
    };
    scales?: {
      x?: { ticks?: { autoSkip?: boolean } };
      y?: {
        beginAtZero?: boolean;
        min?: number;
        ticks?: { callback?: (value: number) => string | string[] };
      };
    };
  };
}

async function createComponent(
  inputPoints: readonly FinancialCumulativeEvolutionPoint[] = points,
): Promise<ComponentFixture<FinancialIncomeExpenseChart>> {
  await TestBed.configureTestingModule({ imports: [FinancialIncomeExpenseChart] })
    .overrideComponent(FinancialIncomeExpenseChart, {
      remove: { imports: [BaseChartDirective] },
      add: { imports: [BaseChartStubDirective] },
    })
    .compileComponents();

  const fixture = TestBed.createComponent(FinancialIncomeExpenseChart);
  fixture.componentRef.setInput('points', inputPoints);
  fixture.detectChanges();
  return fixture;
}

describe('FinancialIncomeExpenseChart', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('maps the backend points into exactly two positive line series', async () => {
    const component = (await createComponent()).componentInstance as unknown as TestApi;
    const data = component.chartData();

    expect(component.chartType).toBe('line');
    expect(data.labels).toEqual(['Jan', 'Fev']);
    expect(data.datasets).toHaveLength(2);
    expect(data.datasets.map((dataset) => dataset.label)).toEqual([
      'Receitas acumuladas',
      'Despesas acumuladas',
    ]);
    expect(data.datasets[0].data).toEqual([100000, 220000]);
    expect(data.datasets[1].data).toEqual([80000, 170000]);
    expect(data.datasets.some((dataset) => dataset.label?.includes('Resultado'))).toBe(false);
    expect(data.datasets.every((dataset) => dataset.data.every((value) => Number(value) >= 0))).toBe(
      true,
    );
  });

  it('uses the financial colors and renders unfilled moderately smoothed lines', async () => {
    const datasets = (await createComponent()).componentInstance as unknown as TestApi;

    expect(datasets.chartData().datasets[0]).toMatchObject({
      borderColor: '#22C55E',
      borderWidth: 2.5,
      tension: 0.2,
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 5,
    });
    expect(datasets.chartData().datasets[1]).toMatchObject({
      borderColor: '#DC2626',
      fill: false,
    });
  });

  it('starts the scale at zero and formats compact BRL axis values', async () => {
    const options = ((await createComponent()).componentInstance as unknown as TestApi).chartOptions();

    expect(options.scales?.y?.beginAtZero).toBe(true);
    expect(options.scales?.y?.min).toBe(0);
    expect(options.scales?.y?.ticks?.callback?.(200000)).toContain('200');
    expect(options.scales?.x?.ticks?.autoSkip).toBe(true);
  });

  it('formats monthly and quarterly tooltip titles without a result row', async () => {
    const monthly = ((await createComponent()).componentInstance as unknown as TestApi).chartOptions();
    const monthlyTooltip = monthly.plugins?.tooltip?.callbacks;

    expect(monthlyTooltip?.title?.([{ dataIndex: 0 }])).toContain('janeiro');
    expect(monthlyTooltip?.title?.([{ dataIndex: 0 }])).toContain('2026');
    expect(
      monthlyTooltip?.label?.({
        dataset: { label: 'Receitas acumuladas' },
        parsed: { y: 100000 },
      }),
    ).toContain('R$');

    TestBed.resetTestingModule();
    const quarterlyPoint = { ...points[0], period: '2026-Q1', label: '1º tri' };
    const quarterly = (
      (await createComponent([quarterlyPoint])).componentInstance as unknown as TestApi
    ).chartOptions();
    expect(quarterly.plugins?.tooltip?.callbacks?.title?.([{ dataIndex: 0 }])).toBe(
      '1º tri de 2026',
    );
  });

  it('renders an accessible legend and textual data alternative', async () => {
    const fixture = await createComponent();
    const legend = fixture.nativeElement.querySelector(
      '[aria-label="Legenda do gráfico de receitas e despesas acumuladas"]',
    ) as HTMLElement;
    const accessibleData = fixture.nativeElement.querySelector(
      '[aria-label="Dados do gráfico de receitas e despesas acumuladas"]',
    ) as HTMLElement;

    expect(legend.textContent).toContain('Receitas');
    expect(legend.textContent).toContain('Despesas');
    expect(legend.textContent).not.toContain('Resultado');
    expect(accessibleData.textContent).toContain('R$');
  });

  it('shows the empty state instead of zero-only lines', async () => {
    const fixture = await createComponent(
      points.map((point) => ({ ...point, cumulativeIncome: 0, cumulativeExpense: 0 })),
    );

    expect((fixture.componentInstance as unknown as TestApi).hasData()).toBe(false);
    expect(fixture.nativeElement.querySelector('canvas')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Não há receitas ou despesas realizadas para o período selecionado.',
    );
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
});
