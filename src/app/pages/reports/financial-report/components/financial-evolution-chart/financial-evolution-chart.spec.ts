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
  realizedIncome: (index + 3) * 1000,
  projectedIncome: 1000,
  overdueIncome: index === 1 ? 500 : 0,
  overdueIncomeCount: index === 1 ? 1 : 0,
  realizedExpense: (index + 1) * 1000,
  projectedExpense: 500,
  overdueExpense: 0,
  overdueExpenseCount: 0,
  realizedResult: (index + 2) * 1000,
  currentPeriod: index === 7,
}));

interface TestApi {
  chartType: 'bar';
  chartData: () => {
    labels?: unknown[];
    datasets: {
      type?: string;
      label?: string;
      data: unknown[];
      stack?: string;
      order?: number;
      borderColor?: string;
      backgroundColor?: string;
      borderWidth?: number;
      tension?: number;
      fill?: boolean;
      pointRadius?: number;
      pointHoverRadius?: number;
      borderDash?: number[];
      borderSkipped?: boolean;
      borderRadius?: unknown;
      inflateAmount?: number;
    }[];
  };
  chartOptions: () => {
    plugins?: {
      legend?: { display?: boolean; position?: string };
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
      x?: {
        stacked?: boolean;
        ticks?: { color?: (context: { index: number }) => string };
      };
      y?: {
        stacked?: boolean;
        min?: number;
        grid?: {
          color?: (context: { tick: { value: number } }) => string;
          lineWidth?: (context: { tick: { value: number } }) => number;
        };
        ticks?: { callback?: (value: number) => string | string[]; stepSize?: number };
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

  it('maps Jan–Dez into one segmented financial column with a blue realized result line', async () => {
    const component = (await createComponent()).componentInstance as unknown as TestApi;
    const chartData = component.chartData();

    expect(component.chartType).toBe('bar');
    expect(chartData.labels).toEqual(labels);
    expect(chartData.datasets.map(({ type, label }) => ({ type, label }))).toEqual([
      { type: 'bar', label: 'Receitas realizadas' },
      { type: 'bar', label: 'Receitas projetadas' },
      { type: 'bar', label: 'Receitas vencidas' },
      { type: 'bar', label: 'Despesas realizadas' },
      { type: 'bar', label: 'Despesas projetadas' },
      { type: 'bar', label: 'Despesas vencidas' },
      { type: 'line', label: 'Resultado realizado' },
    ]);
    expect(chartData.datasets[0].data).toEqual(points.map((point) => point.realizedIncome));
    expect(chartData.datasets[3].data).toEqual(points.map((point) => -point.realizedExpense));
    expect(chartData.datasets[6].data).toEqual(points.map((point) => point.realizedResult));
    expect(chartData.datasets.slice(0, 6).map((dataset) => dataset.stack)).toEqual(
      Array(6).fill('financial'),
    );
    expect(chartData.datasets[0].backgroundColor).toBe('#22C55E');
    expect(chartData.datasets[3].backgroundColor).toBe('#DC2626');
    expect(chartData.datasets[1].backgroundColor).toBe('rgba(34, 197, 94, 0.28)');
    expect(chartData.datasets[2].backgroundColor).toBe('rgba(34, 197, 94, 0.52)');
    expect(chartData.datasets[4].backgroundColor).toBe('rgba(220, 38, 38, 0.28)');
    expect(chartData.datasets[5].backgroundColor).toBe('rgba(220, 38, 38, 0.52)');
    expect(chartData.datasets[0].order).toBe(1);
    expect(chartData.datasets[1].order).toBe(1);
    expect(chartData.datasets[6].order).toBe(0);
    expect(chartData.datasets.slice(0, 6).map((dataset) => dataset.borderWidth)).toEqual(
      Array(6).fill(0),
    );
    expect(chartData.datasets.slice(0, 6).map((dataset) => dataset.inflateAmount)).toEqual(
      Array(6).fill(0),
    );
    expect(chartData.datasets[6]).toMatchObject({
      borderColor: '#2563EB',
      backgroundColor: '#2563EB',
      borderWidth: 2,
      tension: 0.25,
      fill: false,
      pointRadius: 3,
      pointHoverRadius: 5,
    });
    expect(points[1].expense).toBe(3000);
  });

  it('rounds only the outer ends of continuous stacked bars', async () => {
    const component = (await createComponent()).componentInstance as unknown as TestApi;
    const datasets = component.chartData().datasets;
    const overdueIncomeRadius = datasets[2].borderRadius as readonly unknown[];
    const projectedExpenseRadius = datasets[4].borderRadius as readonly unknown[];

    expect(datasets.slice(0, 6).map((dataset) => dataset.borderSkipped)).toEqual(
      Array(6).fill(false),
    );
    expect(overdueIncomeRadius[1]).toEqual({
      topLeft: 3,
      topRight: 3,
      bottomLeft: 0,
      bottomRight: 0,
    });
    expect(projectedExpenseRadius[0]).toEqual({
      topLeft: 0,
      topRight: 0,
      bottomLeft: 3,
      bottomRight: 3,
    });
    expect((datasets[0].borderRadius as readonly unknown[])[1]).toBe(0);
  });

  it('uses a shared fixed scale with an emphasized zero grid line', async () => {
    const component = (await createComponent()).componentInstance as unknown as TestApi;
    const options = component.chartOptions();
    const grid = options.scales?.y?.grid;

    expect(options.plugins?.legend?.display).toBe(false);
    expect(options.scales?.x?.stacked).toBe(true);
    expect(options.scales?.y?.stacked).toBe(true);
    expect(options.scales?.y?.min).toBeDefined();
    expect(options.scales?.y?.ticks?.stepSize).toBeGreaterThan(0);
    expect(grid?.lineWidth?.({ tick: { value: 0 } })).toBeGreaterThan(
      grid?.lineWidth?.({ tick: { value: 1 } }) ?? 0,
    );
    expect(grid?.color?.({ tick: { value: 0 } })).not.toBe(grid?.color?.({ tick: { value: 1 } }));
  });

  it('reserves the fixed y-axis width from the complete formatted tick labels', async () => {
    const fixture = await createComponent();
    fixture.componentRef.setInput(
      'points',
      points.map((point, index) =>
        index === 0
          ? {
              ...point,
              realizedIncome: 1_500_000,
              realizedExpense: 1_500_000,
              realizedResult: -1_500_000,
            }
          : point,
      ),
    );
    fixture.detectChanges();
    const axis = fixture.nativeElement.querySelector(
      '[data-testid="financial-evolution-y-axis"]',
    ) as HTMLDivElement;
    const visibleLabels = Array.from(axis.querySelectorAll('span.absolute'));
    const measurementLabels = Array.from(axis.querySelectorAll('div.invisible span'));

    expect(axis.classList).toContain('w-max');
    expect(axis.classList).toContain('shrink-0');
    expect(axis.classList).toContain('pl-1');
    expect(axis.classList).toContain('pr-3');
    expect(visibleLabels).toHaveLength(measurementLabels.length);
    expect(measurementLabels.map((label) => label.textContent?.trim())).toEqual(
      visibleLabels.map((label) => label.textContent?.trim()),
    );
    expect(measurementLabels.some((label) => label.textContent?.includes('-R$'))).toBe(true);
    expect(measurementLabels.some((label) => label.textContent?.includes('1.000.000'))).toBe(true);
    expect(visibleLabels.every((label) => label.classList.contains('whitespace-nowrap'))).toBe(true);
  });

  it('colors only the current period x-axis label in blue', async () => {
    const component = (await createComponent()).componentInstance as unknown as TestApi;
    const color = component.chartOptions().scales?.x?.ticks?.color;

    expect(color?.({ index: 7 })).toBe('#2563EB');
    expect(color?.({ index: 6 })).toBe('#6B7280');
  });

  it('renders an accessible compact legend with a state information tooltip', async () => {
    const fixture = await createComponent();
    const legend = fixture.nativeElement.querySelector(
      '[aria-label="Legenda do gráfico de evolução financeira"]',
    ) as HTMLDivElement;

    expect(legend.textContent).toContain('Receitas');
    expect(legend.textContent).toContain('Despesas');
    expect(legend.textContent).toContain('Resultado realizado');
    expect(legend.querySelectorAll(':scope > span')).toHaveLength(3);
    expect(legend.querySelector('gd-tooltip')).not.toBeNull();
  });

  it('does not render a current-period background plugin', async () => {
    const component = (await createComponent()).componentInstance;

    expect('currentPeriodPlugin' in component).toBe(false);
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

  it('shows overdue counts and realized result in the detailed tooltip', async () => {
    const component = (await createComponent()).componentInstance as unknown as TestApi;
    const rows = (component as unknown as { tooltipRows: (index: number) => string[] }).tooltipRows(1);

    expect(rows.join('\n')).toContain('Receitas vencidas');
    expect(rows.join('\n')).toContain('1 movimentação');
    expect(rows.join('\n')).toContain('Resultado realizado');
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
