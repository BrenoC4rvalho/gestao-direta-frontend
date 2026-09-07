import { TestBed } from '@angular/core/testing';

import { HarvestPlanningComparisonMetric } from '../../../../../core/models/harvest-season.models';
import { PlanningComparisonCard, PlanningComparisonCardModel } from './planning-comparison-card';

describe('PlanningComparisonCard', () => {
  it('should pass planned and projected values unchanged to the two chart bars', async () => {
    const component = await createComponent(
      card('Resultado', metric(56000, -12450, -68450, -122.23, 'BELOW_PLANNED', 'WORSE')),
      'Projeção atual',
      'PROJECTED',
    );

    const chartData = component.chartData();

    expect(chartData.labels).toEqual(['Planejado', 'Projeção atual']);
    expect(chartData.datasets).toHaveLength(1);
    expect(chartData.datasets[0].data).toEqual([56000, -12450]);
    expect(component.formattedDifference()).toBe('-R$ 68.450,00');
    expect(component.explanation()).toContain('R$ 68.450,00 abaixo do planejado');
  });

  it('should keep negative margins and format the difference in percentage points', async () => {
    const component = await createComponent(
      card(
        'Margem',
        metric(23.53, -8.19, -31.72, null, 'BELOW_PLANNED', 'WORSE', 'PERCENTAGE_POINTS'),
      ),
      'Realizado',
      'REALIZED',
    );

    const chartData = component.chartData();

    expect(chartData.labels).toEqual(['Planejado', 'Realizado']);
    expect(chartData.datasets[0].data).toEqual([23.53, -8.19]);
    expect(component.formattedDifference()).toBe('-31,72 p.p.');
    expect(component.formattedPercentageDifference()).toBeNull();
    expect(component.explanation()).toContain('31,72 pontos percentuais abaixo do planejado');
  });

  it('should use backend semantic for the difference color and math direction for the arrow', async () => {
    const component = await createComponent(
      card('Custo', metric(182000, 164450, -17550, -9.64, 'BELOW_PLANNED', 'BETTER')),
      'Projeção atual',
      'PROJECTED',
    );

    expect(component.semanticClasses()).toBe('text-success');
    expect(component.arrow()).toBe('↓');
    expect(component.formattedPercentageDifference()).toBe('-9,64%');
  });

  function metric(
    planned: number,
    current: number,
    difference: number,
    percentageDifference: number | null,
    position: HarvestPlanningComparisonMetric['position'],
    semantic: HarvestPlanningComparisonMetric['semantic'],
    differenceUnit: HarvestPlanningComparisonMetric['differenceUnit'] = 'AMOUNT',
  ): HarvestPlanningComparisonMetric {
    return {
      planned,
      current,
      difference,
      percentageDifference,
      position,
      semantic,
      differenceUnit,
    };
  }

  function card(
    title: string,
    cardMetric: HarvestPlanningComparisonMetric,
  ): PlanningComparisonCardModel {
    return {
      title,
      projectedDescription: `O ${title.toLowerCase()} projetado`,
      realizedDescription: `O ${title.toLowerCase()} realizado`,
      icon: 'wallet',
      plannedColor: 'rgba(245, 158, 11, 0.30)',
      currentColor: '#F59E0B',
      explanationMode:
        cardMetric.differenceUnit === 'PERCENTAGE_POINTS'
          ? 'PERCENTAGE_POINTS'
          : title === 'Resultado'
            ? 'AMOUNT'
            : 'PERCENTAGE',
      metric: cardMetric,
    };
  }

  async function createComponent(
    currentCard: PlanningComparisonCardModel,
    currentLabel: string,
    basis: 'PROJECTED' | 'REALIZED',
  ) {
    await TestBed.configureTestingModule({ imports: [PlanningComparisonCard] })
      .overrideComponent(PlanningComparisonCard, { set: { template: '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(PlanningComparisonCard);
    fixture.componentRef.setInput('card', currentCard);
    fixture.componentRef.setInput('currentLabel', currentLabel);
    fixture.componentRef.setInput('basis', basis);
    fixture.detectChanges();
    return fixture.componentInstance as unknown as {
      chartData: () => { labels?: unknown[]; datasets: { data: unknown[] }[] };
      formattedDifference: () => string;
      formattedPercentageDifference: () => string | null;
      explanation: () => string;
      semanticClasses: () => string;
      arrow: () => string;
    };
  }
});
