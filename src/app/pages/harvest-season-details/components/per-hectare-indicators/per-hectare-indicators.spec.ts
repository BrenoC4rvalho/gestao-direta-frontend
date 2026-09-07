import { TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import {
  HarvestSeasonDetailSummary,
  HarvestSeasonStatus,
} from '../../../../core/models/harvest-season.models';
import { PerHectareIndicators } from './per-hectare-indicators';

const summary: HarvestSeasonDetailSummary = {
  harvestSeasonId: 1,
  harvestSeasonName: 'Safra Soja 2026',
  productionActivityId: 2,
  productionActivityName: 'Soja',
  farmId: 10,
  farmName: 'Fazenda Boa Safra',
  areaHectares: 50,
  planning: { plannedCost: 100000, plannedRevenue: 150000, plannedProfit: 50000, plannedMargin: 33.33 },
  realized: { realizedCost: 60000, realizedRevenue: 80000, realizedProfit: 20000, realizedMargin: 25 },
  projection: { projectedCost: 120000, projectedRevenue: 180000, projectedProfit: 60000, projectedMargin: 33.33 },
  comparison: {
    profitPerformanceAmount: 10000,
    profitPerformancePercentage: 20,
    profitPerformanceStatus: 'ABOVE_PLANNED',
    costVarianceAmount: 20000,
    costVariancePercentage: 20,
    costVarianceStatus: 'ABOVE_PLANNED',
  },
  openAmounts: {
    payableAmount: 60000,
    receivableAmount: 100000,
    pending: { payableAmount: 60000, receivableAmount: 100000 },
    overdue: { payableAmount: 0, receivableAmount: 0 },
  },
  plannedCostPerHectare: 2000,
  plannedRevenuePerHectare: 3000,
  plannedResultPerHectare: 1000,
  projectedCostPerHectare: 2400,
  projectedRevenuePerHectare: 3600,
  projectedProfitPerHectare: 1200,
  realizedCostPerHectare: 1200,
  realizedRevenuePerHectare: 1600,
  realizedProfitPerHectare: 400,
  transactionCount: 3,
  incomeCount: 1,
  expenseCount: 2,
};

describe('PerHectareIndicators', () => {
  it('should render planned indicators received from the summary', async () => {
    const fixture = await createComponent('PLANNED');

    expect(text(fixture)).toContain('Custo planejado/ha');
    expect(text(fixture)).toContain('Receita planejada/ha');
    expect(text(fixture)).toContain('Resultado planejado/ha');
    expect(text(fixture)).toContain('R$ 2.000,00/ha');
    expect(fixture.nativeElement.querySelector('gd-tooltip')).not.toBeNull();
  });

  it('should select projected indicators while the harvest is in progress', async () => {
    const fixture = await createComponent('IN_PROGRESS');

    expect(text(fixture)).toContain('Custo projetado/ha');
    expect(text(fixture)).toContain('Receita projetada/ha');
    expect(text(fixture)).toContain('Lucro projetado/ha');
    expect(text(fixture)).toContain('R$ 2.400,00/ha');
  });

  it.each<HarvestSeasonStatus>(['FINISHED', 'INACTIVE'])
  ('should select realized indicators for %s harvests', async (status) => {
    const fixture = await createComponent(status);

    expect(text(fixture)).toContain('Custo realizado/ha');
    expect(text(fixture)).toContain('Receita realizada/ha');
    expect(text(fixture)).toContain('Lucro realizado/ha');
    expect(text(fixture)).toContain('R$ 1.200,00/ha');
  });

  it('should show an empty state when the backend returns no per-hectare values', async () => {
    const fixture = await createComponent('PLANNED', {
      ...summary,
      plannedCostPerHectare: null,
      plannedRevenuePerHectare: null,
      plannedResultPerHectare: null,
    });

    expect(text(fixture)).toContain('Informe a área da Safra para visualizar os indicadores por hectare.');
    expect(fixture.nativeElement.querySelectorAll('gd-summary-card')).toHaveLength(0);
  });

  async function createComponent(status: HarvestSeasonStatus, currentSummary = summary) {
    await TestBed.configureTestingModule({
      imports: [PerHectareIndicators],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(PerHectareIndicators);
    fixture.componentRef.setInput('status', status);
    fixture.componentRef.setInput('summary', currentSummary);
    fixture.detectChanges();
    return fixture;
  }

  function text(fixture: ReturnType<typeof TestBed.createComponent<PerHectareIndicators>>): string {
    return fixture.nativeElement.textContent ?? '';
  }
});
