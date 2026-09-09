import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { Badge } from '../../../../shared/ui';

interface PlanningCategory {
  readonly name: string;
  readonly items: number;
  readonly planned: string;
  readonly realized: string;
  readonly variance: string;
  readonly width: string;
  readonly over: boolean;
}

interface ComparisonMetric {
  readonly label: string;
  readonly first: string;
  readonly second: string;
  readonly best: 'first' | 'second' | null;
}

@Component({
  selector: 'gd-harvest-showcase',
  imports: [Badge, LucideDynamicIcon],
  templateUrl: './harvest-showcase.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HarvestShowcase {
  protected readonly categories: readonly PlanningCategory[] = [
    { name: 'Fertilizantes', items: 3, planned: 'R$ 28.400', realized: 'R$ 31.180', variance: '+ R$ 2.780', width: '88%', over: true },
    { name: 'Mão de obra', items: 4, planned: 'R$ 27.850', realized: 'R$ 25.600', variance: '− R$ 2.250', width: '73%', over: false },
    { name: 'Combustíveis', items: 2, planned: 'R$ 14.200', realized: 'R$ 12.970', variance: '− R$ 1.230', width: '51%', over: false },
    { name: 'Defensivos', items: 2, planned: 'R$ 19.340', realized: 'R$ 18.760', variance: '− R$ 580', width: '62%', over: false },
  ];

  protected readonly comparison: readonly ComparisonMetric[] = [
    { label: 'Receita realizada', first: 'R$ 168.900', second: 'R$ 184.320', best: 'second' },
    { label: 'Custo realizado', first: 'R$ 124.600', second: 'R$ 126.850', best: 'first' },
    { label: 'Resultado realizado', first: 'R$ 44.300', second: 'R$ 57.470', best: 'second' },
    { label: 'Margem realizada', first: '26,2%', second: '31,2%', best: 'second' },
    { label: 'Resultado / ha', first: 'R$ 1.042', second: 'R$ 1.352', best: 'second' },
  ];
}
