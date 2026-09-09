import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { Badge } from '../../../../shared/ui';

interface AgendaItem {
  readonly description: string;
  readonly context: string;
  readonly due: string;
  readonly amount: string;
  readonly type: 'payable' | 'receivable';
}

@Component({
  selector: 'gd-financial-showcase',
  imports: [Badge, LucideDynamicIcon],
  templateUrl: './financial-showcase.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialShowcase {
  protected readonly agendaItems: readonly AgendaItem[] = [
    { description: 'Fornecedor de fertilizantes', context: 'Café 2026/2027', due: 'Vence em 5 dias', amount: 'R$ 8.420,00', type: 'payable' },
    { description: 'Venda de produção', context: 'Café 2026/2027', due: 'Recebimento previsto', amount: 'R$ 24.800,00', type: 'receivable' },
    { description: 'Manutenção do trator', context: 'Sem Safra', due: 'Vencida há 2 dias', amount: 'R$ 2.180,00', type: 'payable' },
  ];
}
