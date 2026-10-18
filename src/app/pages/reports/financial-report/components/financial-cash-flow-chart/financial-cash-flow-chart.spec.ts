import { Directive, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideFinancialReportLucideIcons } from '../../../../../core/constants/lucide-icons';
import {
  FinancialCashFlowPoint,
  FinancialReportGranularity,
} from '../../../../../core/models/financial-report.models';
import { FinancialCashFlowChart } from './financial-cash-flow-chart';
import { BaseChartDirective } from 'ng2-charts';

@Directive({ selector: 'canvas[baseChart]' })
class BaseChartStubDirective {
  readonly type = input();
  readonly data = input();
  readonly options = input();

  update(): void {}
}

const points: readonly FinancialCashFlowPoint[] = [
  {
    period: '2026-01',
    label: 'Jan',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    realizedIncome: 10000,
    realizedExpense: 8000,
    projectedIncome: 5000,
    projectedExpense: 3000,
    overdueIncome: 1000,
    overdueExpense: 500,
    expectedBalance: 12000,
    projectedBalance: 8000,
    currentPeriod: false,
  },
  {
    period: '2026-02',
    label: 'Fev',
    periodStart: '2026-02-01',
    periodEnd: '2026-02-28',
    realizedIncome: 4000,
    realizedExpense: 7000,
    projectedIncome: 1000,
    projectedExpense: 3000,
    overdueIncome: 0,
    overdueExpense: 2000,
    expectedBalance: -4000,
    projectedBalance: -8000,
    currentPeriod: true,
  },
];

interface ChartDataset {
  label?: string;
  data: number[];
  borderColor?: string;
  borderDash?: number[];
  pointRadius?: number[];
  pointBackgroundColor?: string[];
  segment?: {
    borderColor?: (context: {
      p0: { parsed: { y: number | null } };
      p1: { parsed: { y: number | null } };
    }) => string;
  };
}

interface TestApi {
  fullscreen: () => boolean;
  settingsOpen: () => boolean;
  chartWidth: () => number;
  chartData: () => { labels?: unknown[]; datasets: ChartDataset[] };
  chartOptions: () => {
    plugins?: {
      tooltip?: {
        callbacks?: {
          title?: (items: { dataIndex: number }[]) => string;
          label?: (item: {
            dataset: { label?: string };
            parsed: { y: number };
          }) => string;
          afterBody?: (items: { dataIndex: number }[]) => string[];
        };
      };
    };
    scales?: {
      x?: { position?: string };
      y?: {
        min?: number;
        max?: number;
        ticks?: { display?: boolean; stepSize?: number };
      };
    };
  };
  toggleSettings: () => void;
  selectGranularity: (granularity: FinancialReportGranularity) => void;
  toggleFullscreen: () => void;
  handleEscape: (event: Event) => void;
  granularityChange: {
    subscribe: (listener: (value: FinancialReportGranularity) => void) => unknown;
  };
}

async function createComponent(
  inputPoints: readonly FinancialCashFlowPoint[] = points,
): Promise<ComponentFixture<FinancialCashFlowChart>> {
  await TestBed.configureTestingModule({
    imports: [FinancialCashFlowChart],
    providers: [provideFinancialReportLucideIcons()],
  })
    .overrideComponent(FinancialCashFlowChart, {
      remove: { imports: [BaseChartDirective] },
      add: { imports: [BaseChartStubDirective] },
    })
    .compileComponents();

  const fixture = TestBed.createComponent(FinancialCashFlowChart);
  fixture.componentRef.setInput('points', inputPoints);
  fixture.componentRef.setInput('granularity', 'MONTHLY');
  fixture.detectChanges();
  return fixture;
}

describe('FinancialCashFlowChart', () => {
  afterEach(() => {
    document.body.classList.remove('gd-overlay-open');
    TestBed.resetTestingModule();
  });

  it('renders the expected and delayed balance series with original values', async () => {
    const component = (await createComponent()).componentInstance as unknown as TestApi;
    const chartData = component.chartData();

    expect(chartData.labels).toEqual(['Jan', 'Fev']);
    expect(chartData.datasets).toHaveLength(2);
    expect(chartData.datasets.map(({ label, data }) => ({ label, data }))).toEqual([
      { label: 'Saldo previsto', data: [12000, -4000] },
      { label: 'Saldo com atrasos', data: [8000, -8000] },
    ]);
  });

  it('uses a solid expected line and a dashed delayed line', async () => {
    const component = (await createComponent()).componentInstance as unknown as TestApi;
    const datasets = component.chartData().datasets;

    expect(datasets[0].borderColor).toBe('#2563EB');
    expect(datasets[0].borderDash).toEqual([]);
    expect(datasets[1].borderDash).toEqual([6, 5]);
    expect(datasets[1].borderColor).toBe('rgba(37, 99, 235, 0.7)');
  });

  it('supports negative balances and highlights only negative segments', async () => {
    const component = (await createComponent()).componentInstance as unknown as TestApi;
    const chartData = component.chartData();
    const segmentColor = chartData.datasets[0].segment?.borderColor;

    expect(component.chartOptions().scales?.y?.min).toBeLessThan(0);
    expect(component.chartOptions().scales?.y?.max).toBeGreaterThan(0);
    expect(component.chartOptions().scales?.y?.ticks?.display).toBe(true);
    expect(segmentColor?.({ p0: { parsed: { y: -1 } }, p1: { parsed: { y: -2 } } })).toBe(
      '#DC2626',
    );
    expect(segmentColor?.({ p0: { parsed: { y: 1 } }, p1: { parsed: { y: 2 } } })).toBe(
      '#2563EB',
    );
  });

  it('marks the lowest balance point and draws a visible zero reference', async () => {
    const component = (await createComponent()).componentInstance as unknown as TestApi;
    const chartData = component.chartData();

    expect(chartData.datasets[0].pointRadius).toEqual([3, 3]);
    expect(chartData.datasets[1].pointRadius).toEqual([2, 5]);
    expect(component.chartOptions().scales?.x?.position).toBe('bottom');
    expect(component.chartOptions().scales?.y?.min).toBeLessThan(0);
  });

  it('groups both balances, difference and overdue values in the tooltip', async () => {
    const component = (await createComponent()).componentInstance as unknown as TestApi;
    const callbacks = component.chartOptions().plugins?.tooltip?.callbacks;
    const label = callbacks?.label?.({
      dataset: { label: 'Saldo previsto' },
      parsed: { y: -4000 },
    });
    const rows = callbacks?.afterBody?.([{ dataIndex: 1 }]);

    expect(callbacks?.title?.([{ dataIndex: 1 }])).toContain('Fev');
    expect(label).toBe('Saldo previsto: -R$ 4.000,00');
    expect(rows).toContain('Diferença: R$ 4.000,00');
    expect(rows).toContain('Menor saldo: Saldo com atrasos (-R$ 8.000,00)');
    expect(rows).toContain('Em atraso a pagar: -R$ 2.000,00');
  });

  it('opens settings and emits the shared granularity selection', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as TestApi;
    const selected: FinancialReportGranularity[] = [];
    component.granularityChange.subscribe((value) => selected.push(value));

    component.toggleSettings();
    fixture.detectChanges();

    const settings = document.body.querySelector('#financial-cash-flow-settings') as HTMLElement;
    expect(component.settingsOpen()).toBe(true);
    expect(settings.querySelector('[aria-pressed="true"]')?.textContent).toContain('Mensal');

    (settings.querySelector('button:last-child') as HTMLButtonElement).click();
    expect(selected).toEqual(['QUARTERLY']);
  });

  it('closes settings with Escape and fullscreen with a second Escape', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as TestApi;

    component.toggleSettings();
    fixture.detectChanges();
    component.handleEscape(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(component.settingsOpen()).toBe(false);
    component.toggleFullscreen();
    fixture.detectChanges();
    expect(component.fullscreen()).toBe(true);
    expect(document.body.querySelector('[aria-label="Fluxo de caixa acumulado em tela cheia"]')).not.toBeNull();

    component.handleEscape(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(component.fullscreen()).toBe(false);
  });

  it('renders an accessible empty state without a chart when there are no points', async () => {
    const fixture = await createComponent([]);

    expect(fixture.nativeElement.textContent).toContain(
      'Não há dados de fluxo de caixa para o período selecionado.',
    );
    expect(fixture.nativeElement.querySelector('canvas')).toBeNull();
  });
});
