import { Directive, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinancialHarvestSummary } from '../../../../../core/models/financial-report.models';
import { FinancialHarvestParticipation } from './financial-harvest-participation';

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
    transactionCount: 10,
    details: null,
  },
  {
    harvestSeasonId: null,
    harvestSeasonName: 'Sem safra',
    income: 0,
    expense: 5530,
    profit: -5530,
    marginPercentage: 0,
    transactionCount: 1,
    details: null,
  },
];

interface ParticipationTestApi {
  chartDefinitions: () => readonly {
    title: string;
    entries: readonly { label: string; value: number; percentage: number; color: string }[];
    data: { labels?: unknown[]; datasets: { data: unknown[] }[] };
  }[];
  negativeProfits: () => readonly { label: string; value: number }[];
  netProfit: () => number;
  hasAnyValue: () => boolean;
}

async function createComponent(): Promise<ComponentFixture<FinancialHarvestParticipation>> {
  await TestBed.configureTestingModule({
    imports: [FinancialHarvestParticipation],
  })
    .overrideComponent(FinancialHarvestParticipation, {
      remove: { imports: [BaseChartStubDirective] },
      add: { imports: [BaseChartStubDirective] },
    })
    .compileComponents();

  const fixture = TestBed.createComponent(FinancialHarvestParticipation);
  fixture.componentRef.setInput('harvests', harvests);
  fixture.detectChanges();
  return fixture;
}

describe('FinancialHarvestParticipation', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('includes Sem safra in income and expense participation totals', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as ParticipationTestApi;
    const definitions = component.chartDefinitions();

    expect(definitions[0].entries).toEqual([
      expect.objectContaining({ label: 'Café 2026/2027', value: 200000, percentage: 100 }),
    ]);
    expect(definitions[1].entries).toEqual([
      expect.objectContaining({ label: 'Café 2026/2027', value: 120000 }),
      expect.objectContaining({ label: 'Sem safra', value: 5530 }),
    ]);
    expect(definitions[1].entries[1].percentage).toBeCloseTo((5530 / 125530) * 100, 8);
    expect(definitions[1].entries[1].color).toBe('#6B7280');
  });

  it('keeps a negative Sem safra result out of positive doughnut slices', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as ParticipationTestApi;
    const result = component.chartDefinitions()[2];

    expect(result.entries).toEqual([
      expect.objectContaining({ label: 'Café 2026/2027', value: 80000, percentage: 100 }),
    ]);
    expect(component.negativeProfits()).toEqual([{ label: 'Sem safra', value: -5530 }]);
    expect(component.netProfit()).toBe(74470);
  });

  it('does not create artificial slices for zero values and reports an empty positive metric', async () => {
    const fixture = await createComponent();
    fixture.componentRef.setInput('harvests', [
      {
        ...harvests[0],
        income: 0,
        expense: 0,
        profit: 0,
      },
      {
        ...harvests[1],
        income: 0,
        expense: 0,
        profit: 0,
      },
    ]);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as ParticipationTestApi;

    expect(component.chartDefinitions().every((definition) => definition.entries.length === 0)).toBe(true);
    expect(component.negativeProfits()).toHaveLength(0);
    expect(component.netProfit()).toBe(0);
  });

  it('keeps the participation view available when every result is negative', async () => {
    const fixture = await createComponent();
    fixture.componentRef.setInput('harvests', [
      {
        ...harvests[1],
        income: 0,
        expense: 12000,
        profit: -12000,
      },
    ]);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as ParticipationTestApi;

    expect(component.hasAnyValue()).toBe(true);
    expect(component.chartDefinitions()[2].entries).toHaveLength(0);
    expect(component.negativeProfits()).toEqual([{ label: 'Sem safra', value: -12000 }]);
  });
});
