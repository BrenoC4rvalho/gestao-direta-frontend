import { Directive, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinancialHarvestSummary } from '../../../../../core/models/financial-report.models';
import { FinancialHarvestSummaryChart } from './financial-harvest-summary-chart';

@Directive({ selector: 'canvas[baseChart]' })
class BaseChartStubDirective {
  readonly type = input();
  readonly data = input();
  readonly options = input();
}

const harvests: readonly FinancialHarvestSummary[] = [
  {
    harvestSeasonId: 1,
    harvestSeasonName: 'Café 2026/2027',
    income: 200000,
    expense: 120000,
    profit: 80000,
    marginPercentage: 40,
    transactionCount: 12,
    details: {
      resultPerHectare: 4000,
      periodRevenueShare: 60,
      incomeComparison: {
        planned: 180000,
        difference: 20000,
        percentageDifference: 11.11,
        semantic: 'BETTER',
      },
      expenseComparison: null,
      resultComparison: null,
    },
  },
  {
    harvestSeasonId: 2,
    harvestSeasonName: 'Milho Safrinha 2026',
    income: 50000,
    expense: 80000,
    profit: -30000,
    marginPercentage: -60,
    transactionCount: 6,
    details: null,
  },
  {
    harvestSeasonId: null,
    harvestSeasonName: 'Sem safra',
    income: 12000,
    expense: 5000,
    profit: 7000,
    marginPercentage: 58.33,
    transactionCount: 2,
    details: null,
  },
];

interface ChartTestApi {
  chartData: () => {
    labels?: unknown[];
    datasets: { label?: string; data: unknown[]; backgroundColor?: string }[];
  };
  chartOptions: () => {
    interaction?: { mode?: string };
    scales?: { x?: { stacked?: boolean }; y?: { stacked?: boolean; beginAtZero?: boolean } };
    plugins?: {
      tooltip?: {
        callbacks?: {
          title?: (items: { dataIndex: number }[]) => string;
          afterBody?: (items: { dataIndex: number }[]) => string[];
        };
      };
    };
  };
  chartHarvests: () => readonly FinancialHarvestSummary[];
};

async function createComponent(): Promise<ComponentFixture<FinancialHarvestSummaryChart>> {
  await TestBed.configureTestingModule({
    imports: [FinancialHarvestSummaryChart],
    providers: [{ provide: BaseChartStubDirective, useClass: BaseChartStubDirective }],
  })
    .overrideComponent(FinancialHarvestSummaryChart, {
      remove: { imports: [BaseChartStubDirective] },
      add: { imports: [BaseChartStubDirective] },
    })
    .compileComponents();

  const fixture = TestBed.createComponent(FinancialHarvestSummaryChart);
  fixture.componentRef.setInput('harvests', harvests);
  fixture.detectChanges();
  return fixture;
}

describe('FinancialHarvestSummaryChart', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('uses only linked harvests and creates grouped income, expense and result datasets', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as ChartTestApi;
    const chartData = component.chartData();

    expect(component.chartHarvests()).toHaveLength(2);
    expect(chartData.labels).toEqual(['Café 2026/2027', 'Milho Safrinha 2026']);
    expect(chartData.datasets.map((dataset) => dataset.label)).toEqual([
      'Receita',
      'Despesa',
      'Resultado',
    ]);
    expect(chartData.datasets.map((dataset) => dataset.data)).toEqual([
      [200000, 50000],
      [120000, 80000],
      [80000, -30000],
    ]);
  });

  it('keeps the three metrics grouped without stacking and supports negative results', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as ChartTestApi;
    const options = component.chartOptions();

    expect(options.interaction?.mode).toBe('index');
    expect(options.scales?.x?.stacked).toBe(false);
    expect(options.scales?.y?.stacked).toBe(false);
    expect(options.scales?.y?.beginAtZero).toBe(true);
  });

  it('includes available harvest details in the tooltip', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as ChartTestApi;
    const callbacks = component.chartOptions().plugins?.tooltip?.callbacks;

    expect(callbacks?.title?.([{ dataIndex: 0 }])).toBe('Café 2026/2027');
    expect(callbacks?.afterBody?.([{ dataIndex: 0 }])).toEqual([
      'Margem: 40,0%',
      'Participação no período: 60,0%',
      'Receita planejada: R$ 180.000,00',
      'Resultado/ha: R$ 4.000,00',
    ]);
  });
});
