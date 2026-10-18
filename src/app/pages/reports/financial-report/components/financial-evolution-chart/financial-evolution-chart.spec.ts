import { Directive, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseChartDirective } from 'ng2-charts';

import { provideFinancialReportLucideIcons } from '../../../../../core/constants/lucide-icons';
import {
  FinancialEvolutionPoint,
  FinancialReportGranularity,
} from '../../../../../core/models/financial-report.models';
import { ThemeStore } from '../../../../../core/stores/theme.store';
import { FinancialEvolutionChart } from './financial-evolution-chart';

@Directive({ selector: 'canvas[baseChart]' })
class BaseChartStubDirective {
  readonly type = input();
  readonly data = input();
  readonly options = input();

  update(): void {}
}

const monthlyPoints: readonly FinancialEvolutionPoint[] = [
  {
    period: '2026-01',
    label: 'Jan',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    income: 30000,
    expense: 18500,
    netBalance: 11500,
    transactionCount: 7,
    realizedIncome: 10000,
    projectedIncome: 5000,
    overdueIncome: 2000,
    overdueIncomeCount: 1,
    realizedExpense: 8000,
    projectedExpense: 3000,
    overdueExpense: 1000,
    overdueExpenseCount: 1,
    realizedResult: 2000,
    currentPeriod: true,
  },
  {
    period: '2026-02',
    label: 'Fev',
    periodStart: '2026-02-01',
    periodEnd: '2026-02-28',
    income: 0,
    expense: 0,
    netBalance: 0,
    transactionCount: 0,
    realizedIncome: 0,
    projectedIncome: 0,
    overdueIncome: 0,
    overdueIncomeCount: 0,
    realizedExpense: 0,
    projectedExpense: 0,
    overdueExpense: 0,
    overdueExpenseCount: 0,
    realizedResult: 0,
    currentPeriod: false,
  },
];

interface ChartDataset {
  label?: string;
  data: unknown[];
  stack?: string;
  type?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  barThickness?: number;
  maxBarThickness?: number;
  categoryPercentage?: number;
  barPercentage?: number;
  grouped?: boolean;
  order?: number;
  borderRadius?: unknown;
}

interface TestApi {
  chartType: 'bar';
  fullscreen: () => boolean;
  viewMode: () => 'ALL' | 'REALIZED';
  chartWidth: () => number;
  chartData: () => { labels?: unknown[]; datasets: ChartDataset[] };
  chartOptions: () => {
    plugins?: {
      legend?: { display?: boolean };
      tooltip?: {
        backgroundColor?: string;
        callbacks?: {
          title?: (items: { dataIndex: number }[]) => string;
          label?: (item: {
            dataset: { label?: string; stack?: string };
            dataIndex: number;
            parsed: { y: number };
          }) => string[];
        };
      };
    };
    scales?: {
      x?: { stacked?: boolean; position?: string; offset?: boolean };
      y?: {
        stacked?: boolean;
        beginAtZero?: boolean;
        min?: number;
        max?: number;
        bounds?: string;
        ticks?: {
          display?: boolean;
          stepSize?: number;
          maxTicksLimit?: number;
          crossAlign?: string;
        };
      };
    };
  };
  toggleFullscreen: () => void;
  closeFullscreen: () => void;
  setViewMode: (mode: 'ALL' | 'REALIZED') => void;
  settingsOpen: () => boolean;
  toggleSettings: () => void;
  setOnlyRealized: (event: Event) => void;
  selectGranularity: (granularity: FinancialReportGranularity) => void;
  granularityChange: {
    subscribe: (listener: (value: FinancialReportGranularity) => void) => unknown;
  };
  handleEscape: (event: Event) => void;
}

async function createComponent(
  points: readonly FinancialEvolutionPoint[] = monthlyPoints,
): Promise<ComponentFixture<FinancialEvolutionChart>> {
  await TestBed.configureTestingModule({
    imports: [FinancialEvolutionChart],
    providers: [provideFinancialReportLucideIcons()],
  })
    .overrideComponent(FinancialEvolutionChart, {
      remove: { imports: [BaseChartDirective] },
      add: { imports: [BaseChartStubDirective] },
    })
    .compileComponents();

  const fixture = TestBed.createComponent(FinancialEvolutionChart);
  fixture.componentRef.setInput('points', points);
  fixture.componentRef.setInput('granularity', 'MONTHLY');
  fixture.detectChanges();
  return fixture;
}

describe('FinancialEvolutionChart', () => {
  afterEach(() => {
    document.body.classList.remove('gd-overlay-open');
    TestBed.resetTestingModule();
  });

  it('renders six positive bar datasets in two independent stacks', async () => {
    const component = (await createComponent()).componentInstance as unknown as TestApi;
    const chartData = component.chartData();

    expect(component.chartType).toBe('bar');
    expect(chartData.labels).toEqual(['Jan', 'Fev']);
    expect(chartData.datasets.map(({ label, stack, type }) => ({ label, stack, type }))).toEqual([
      { label: 'Receitas realizadas', stack: 'income', type: undefined },
      { label: 'Receitas projetadas', stack: 'income', type: undefined },
      { label: 'Receitas vencidas', stack: 'income', type: undefined },
      { label: 'Despesas realizadas', stack: 'expense', type: undefined },
      { label: 'Despesas projetadas', stack: 'expense', type: undefined },
      { label: 'Despesas vencidas', stack: 'expense', type: undefined },
    ]);
    expect(chartData.datasets.map((dataset) => dataset.data[0])).toEqual([
      10000, 5000, 2000, 8000, 3000, 1000,
    ]);
    expect(chartData.datasets.every((dataset) => dataset.data.every((value) => Number(value) >= 0))).toBe(
      true,
    );
  });

  it('keeps realized at the base, projected in the middle and overdue at the top', async () => {
    const component = (await createComponent()).componentInstance as unknown as TestApi;
    const datasets = component.chartData().datasets;

    expect(datasets.slice(0, 3).map((dataset) => dataset.order)).toEqual([0, 1, 2]);
    expect(datasets.slice(3).map((dataset) => dataset.order)).toEqual([0, 1, 2]);
    expect(datasets[0].borderWidth).toBe(0);
    expect(datasets[1].borderWidth).toBeGreaterThan(0);
    expect(datasets[2].borderWidth).toBeGreaterThan(0);
    expect(datasets[2].backgroundColor).toBe('#F59E0B');
    expect(datasets[5].backgroundColor).toBe('#F59E0B');
    expect(datasets.map((dataset) => dataset.barThickness)).toEqual([28, 28, 28, 28, 28, 28]);
    expect(datasets.map((dataset) => dataset.maxBarThickness)).toEqual([28, 28, 28, 28, 28, 28]);
    expect(datasets.every((dataset) => dataset.grouped === true)).toBe(true);
    expect((datasets[0].borderRadius as readonly unknown[])[0]).toBe(0);
    expect((datasets[2].borderRadius as readonly unknown[])[0]).toMatchObject({
      topLeft: 4,
      topRight: 4,
    });
  });

  it('configures grouped stacks side by side on positive axes', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as TestApi;
    const options = component.chartOptions();

    expect(options.scales?.x?.stacked).toBe(true);
    expect(options.scales?.x?.position).toBe('bottom');
    expect(options.scales?.x?.offset).toBe(true);
    expect(options.scales?.y?.stacked).toBe(true);
    expect(options.scales?.y?.beginAtZero).toBe(true);
    expect(options.scales?.y?.min).toBe(0);
    expect(options.scales?.y?.bounds).toBe('ticks');
    expect(options.scales?.y?.ticks?.display).toBe(true);
    expect(options.scales?.y?.ticks?.crossAlign).toBe('far');
    expect(options.scales?.y?.ticks?.stepSize).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelector('[data-testid="financial-evolution-y-axis"]')).toBeNull();
  });

  it('groups the hovered bar tooltip by financial type and includes all states and total', async () => {
    const component = (await createComponent()).componentInstance as unknown as TestApi;
    const callbacks = component.chartOptions().plugins?.tooltip?.callbacks;
    const incomeRows = callbacks?.label?.({
      dataset: { label: 'Receitas realizadas', stack: 'income' },
      dataIndex: 0,
      parsed: { y: 10000 },
    });
    const expenseRows = callbacks?.label?.({
      dataset: { label: 'Despesas vencidas', stack: 'expense' },
      dataIndex: 0,
      parsed: { y: 1000 },
    });

    expect(callbacks?.title?.([{ dataIndex: 0 }])).toContain('Jan');
    expect(incomeRows?.[0]).toBe('Tipo: Receita');
    expect(incomeRows).toContain('Realizado: R$ 10.000,00');
    expect(incomeRows).toContain('Projetado: R$ 5.000,00');
    expect(incomeRows).toContain('Vencido: R$ 2.000,00');
    expect(incomeRows).toContain('Total: R$ 17.000,00');
    expect(expenseRows?.[0]).toBe('Tipo: Despesa');
    expect(expenseRows).toContain('Total: R$ 12.000,00');
  });

  it('switches between all states and realized values without changing the source data', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as TestApi;
    const allScale = component.chartOptions().scales?.y?.max;

    expect(component.viewMode()).toBe('ALL');
    expect(component.chartData().datasets).toHaveLength(6);

    component.setViewMode('REALIZED');
    fixture.detectChanges();

    expect(component.viewMode()).toBe('REALIZED');
    expect(component.chartData().datasets.map((dataset) => dataset.data[0])).toEqual([10000, 8000]);
    expect(component.chartData().datasets.map((dataset) => dataset.stack)).toEqual([
      'income',
      'expense',
    ]);
    expect(component.chartOptions().scales?.y?.max).toBeLessThan(allScale ?? Number.POSITIVE_INFINITY);

    component.setViewMode('ALL');
    fixture.detectChanges();

    expect(component.chartData().datasets).toHaveLength(6);
    expect(component.chartData().datasets[2].data[0]).toBe(2000);
  });

  it('preserves monthly and quarterly labels and widths', async () => {
    const quarterlyPoints = monthlyPoints.map((point, index) => ({
      ...point,
      period: `2026-Q${index + 1}`,
      label: `${index + 1}º tri`,
    }));
    const component = (await createComponent(quarterlyPoints)).componentInstance as unknown as TestApi;

    expect(component.chartData().labels).toEqual(['1º tri', '2º tri']);
    expect(component.chartWidth()).toBe(520);
  });

  it('renders grouped legends without a visual container or header controls', async () => {
    const fixture = await createComponent();
    const legend = fixture.nativeElement.querySelector(
      '[aria-label="Legenda do gráfico de evolução financeira"]',
    ) as HTMLElement;

    expect(legend.textContent).toContain('Receitas');
    expect(legend.textContent).toContain('Despesas');
    expect(legend.textContent).toContain('Realizado');
    expect(legend.textContent).toContain('Projetado');
    expect(legend.textContent).toContain('Vencido');
    expect(legend.textContent).not.toContain('Resultado');
    expect(legend.querySelector('[aria-label="Receitas"]')?.textContent).toContain('Realizado');
    expect(legend.querySelector('[aria-label="Despesas"]')?.textContent).toContain('Vencido');
    expect(legend.className).not.toContain('border-border');
    expect(legend.className).not.toContain('bg-background');

    expect(fixture.nativeElement.querySelector('#financial-evolution-only-realized')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Granularidade da evolução financeira"]')).toBeNull();

    const settingsButton = fixture.nativeElement.querySelector(
      '[aria-label="Abrir configurações da evolução financeira"]',
    ) as HTMLButtonElement;
    expect(settingsButton).not.toBeNull();
    settingsButton.click();
    fixture.detectChanges();

    const checkbox = document.body.querySelector(
      '#financial-evolution-only-realized',
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    const component = fixture.componentInstance as unknown as TestApi;
    component.setViewMode('REALIZED');
    fixture.detectChanges();
    expect(checkbox.checked).toBe(true);
    expect(legend.textContent).not.toContain('Projetado');
    expect(legend.textContent).not.toContain('Vencido');

    (fixture.componentInstance as unknown as TestApi).toggleSettings();
    fixture.detectChanges();
  });

  it('toggles the realized-only mode through the checkbox in the settings popover', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as TestApi;
    component.toggleSettings();
    fixture.detectChanges();

    const checkbox = document.body.querySelector(
      '#financial-evolution-only-realized',
    ) as HTMLInputElement;

    checkbox.click();
    fixture.detectChanges();
    expect(component.viewMode()).toBe('REALIZED');
    expect(component.chartData().datasets).toHaveLength(2);

    checkbox.click();
    fixture.detectChanges();
    expect(component.viewMode()).toBe('ALL');
    expect(component.chartData().datasets).toHaveLength(6);
  });

  it('closes the settings popover with Escape and preserves its selections', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as TestApi;

    component.toggleSettings();
    fixture.detectChanges();
    const checkbox = document.body.querySelector('#financial-evolution-only-realized') as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();

    component.handleEscape(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(component.settingsOpen()).toBe(false);
    expect(document.body.querySelector('#financial-evolution-settings')).toBeNull();
    expect(component.viewMode()).toBe('REALIZED');
  });

  it('closes the settings popover when clicking outside it', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as TestApi;

    component.toggleSettings();
    fixture.detectChanges();
    expect(component.settingsOpen()).toBe(true);

    const backdrop = document.body.querySelector('.cdk-overlay-backdrop') as HTMLElement;
    backdrop.click();
    fixture.detectChanges();

    expect(component.settingsOpen()).toBe(false);
    expect(document.body.querySelector('#financial-evolution-settings')).toBeNull();
  });

  it('keeps the selected granularity control inside the settings popover', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as TestApi;
    const selected: FinancialReportGranularity[] = [];
    component.granularityChange.subscribe((value) => selected.push(value));

    component.toggleSettings();
    fixture.detectChanges();

    const popover = document.body.querySelector('#financial-evolution-settings') as HTMLElement;
    expect(popover.textContent).toContain('Mensal');
    expect(popover.textContent).toContain('Trimestral');
    expect(popover.querySelector('[aria-pressed="true"]')?.textContent).toContain('Mensal');

    (popover.querySelector('button:last-child') as HTMLButtonElement).click();
    expect(selected).toEqual(['QUARTERLY']);
  });

  it('does not attach a click handler or period selection output', async () => {
    const fixture = await createComponent();

    expect(fixture.nativeElement.querySelector('canvas')?.getAttribute('(chartClick)')).toBeNull();
    expect((fixture.componentInstance as unknown as Record<string, unknown>)['periodSelected']).toBeUndefined();
  });

  it('opens and closes fullscreen while preserving the complete chart', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as TestApi;

    component.toggleFullscreen();
    fixture.detectChanges();

    expect(component.fullscreen()).toBe(true);
    expect(document.body.classList.contains('gd-overlay-open')).toBe(true);
    expect(document.body.querySelector('.cdk-overlay-container [role="dialog"]')).not.toBeNull();
    expect(component.chartData().datasets).toHaveLength(6);

    component.toggleFullscreen();
    fixture.detectChanges();

    expect(component.fullscreen()).toBe(false);
    expect(document.body.classList.contains('gd-overlay-open')).toBe(false);
    expect(component.chartData().datasets).toHaveLength(6);
    expect(document.body.querySelector('.cdk-overlay-container [role="dialog"]')).toBeNull();
  });

  it('closes fullscreen with Escape', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as TestApi;

    component.toggleFullscreen();
    fixture.detectChanges();
    component.handleEscape(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(component.fullscreen()).toBe(false);
    expect(document.body.classList.contains('gd-overlay-open')).toBe(false);
  });

  it('preserves the realized-only mode while fullscreen is open', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as TestApi;

    component.setViewMode('REALIZED');
    fixture.detectChanges();
    component.toggleFullscreen();
    fixture.detectChanges();

    expect(component.viewMode()).toBe('REALIZED');
    expect(component.chartData().datasets).toHaveLength(2);
    expect(document.body.querySelector('.cdk-overlay-container [role="dialog"]')).not.toBeNull();

    component.closeFullscreen();
    fixture.detectChanges();
    expect(component.viewMode()).toBe('REALIZED');
    expect(component.chartData().datasets).toHaveLength(2);
  });

  it('keeps zero-valued periods and does not duplicate their values', async () => {
    const component = (await createComponent([monthlyPoints[1]])).componentInstance as unknown as TestApi;
    const datasets = component.chartData().datasets;

    expect(datasets).toHaveLength(6);
    expect(datasets.map((dataset) => dataset.data)).toEqual(
      [[0], [0], [0], [0], [0], [0]],
    );
    expect(component.chartOptions().scales?.y?.min).toBe(0);
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
