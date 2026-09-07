import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import { HarvestPlanningComparison } from '../../../../core/models/harvest-season.models';
import { PlanningCurrentComparison } from './planning-current-comparison';

const readyComparison: HarvestPlanningComparison = {
  state: 'READY',
  basis: 'PROJECTED',
  cost: metric(1000, 800, -200, -20, 'BELOW_PLANNED', 'BETTER', 'AMOUNT'),
  revenue: metric(2000, 2300, 300, 15, 'ABOVE_PLANNED', 'BETTER', 'AMOUNT'),
  profit: metric(1000, 1500, 500, 50, 'ABOVE_PLANNED', 'BETTER', 'AMOUNT'),
  margin: metric(50, 65, 15, null, 'ABOVE_PLANNED', 'BETTER', 'PERCENTAGE_POINTS'),
};

function metric(
  planned: number,
  current: number,
  difference: number,
  percentageDifference: number | null,
  position: 'ABOVE_PLANNED' | 'BELOW_PLANNED' | 'ON_TARGET',
  semantic: 'BETTER' | 'WORSE' | 'NEUTRAL',
  differenceUnit: 'AMOUNT' | 'PERCENTAGE_POINTS',
) {
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

describe('PlanningCurrentComparison', () => {
  it('should render projected values, differences, semantics and tooltip from the backend contract', async () => {
    const fixture = await createComponent();

    expect(text(fixture)).toContain('Planejado x atual');
    expect(text(fixture)).toContain('Projeção atual');
    expect(text(fixture)).toContain('R$ 1.000,00');
    expect(text(fixture)).toContain('-R$ 200,00');
    expect(text(fixture)).toContain('(+15,00%)');
    expect(text(fixture)).toContain('15,00% p.p.');
    expect(text(fixture)).toContain('Abaixo do planejado');
    expect(fixture.nativeElement.querySelectorAll('gd-card')).toHaveLength(4);
    expect(fixture.nativeElement.querySelector('gd-tooltip')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.text-success')).not.toBeNull();
  });

  it('should render realized labeling without the projection tooltip', async () => {
    const fixture = await createComponent({ ...readyComparison, basis: 'REALIZED' });

    expect(text(fixture)).toContain('Planejado x realizado');
    expect(text(fixture)).toContain('Realizado');
    expect(fixture.nativeElement.querySelector('gd-tooltip')).toBeNull();
  });

  it('should emit viewPlanning for missing planning', async () => {
    const fixture = await createComponent(emptyComparison('MISSING_PLANNING'));
    const viewPlanning = vi.fn();
    fixture.componentInstance.viewPlanning.subscribe(viewPlanning);

    expect(text(fixture)).toContain('Planejamento financeiro não informado');
    clickAction(fixture);

    expect(viewPlanning).toHaveBeenCalledOnce();
  });

  it.each([
    ['PLANNED', 'Aguardando o início da Safra'],
    ['MISSING_CURRENT_DATA', 'Sem dados financeiros atuais'],
  ] as const)('should show the %s informative state without an action', async (state, title) => {
    const fixture = await createComponent(emptyComparison(state));

    expect(text(fixture)).toContain(title);
    expect(fixture.nativeElement.querySelector('gd-empty-state gd-button')).toBeNull();
  });

  function emptyComparison(
    state: Exclude<HarvestPlanningComparison['state'], 'READY'>,
  ): HarvestPlanningComparison {
    return { state, basis: null, cost: null, revenue: null, profit: null, margin: null };
  }

  async function createComponent(comparison = readyComparison) {
    await TestBed.configureTestingModule({
      imports: [PlanningCurrentComparison],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(PlanningCurrentComparison);
    fixture.componentRef.setInput('comparison', comparison);
    fixture.detectChanges();
    return fixture;
  }

  function clickAction(
    fixture: ReturnType<typeof TestBed.createComponent<PlanningCurrentComparison>>,
  ): void {
    (fixture.nativeElement.querySelector('gd-empty-state button') as HTMLButtonElement).click();
  }

  function text(
    fixture: ReturnType<typeof TestBed.createComponent<PlanningCurrentComparison>>,
  ): string {
    return fixture.nativeElement.textContent ?? '';
  }
});
