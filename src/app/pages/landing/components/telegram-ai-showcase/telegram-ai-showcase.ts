import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { Badge } from '../../../../shared/ui';

interface ParsedField {
  readonly label: string;
  readonly value: string;
}

@Component({
  selector: 'gd-telegram-ai-showcase',
  imports: [Badge, LucideDynamicIcon],
  templateUrl: './telegram-ai-showcase.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TelegramAiShowcase {
  protected readonly expenseFields: readonly ParsedField[] = [
    { label: 'Tipo', value: 'Despesa' },
    { label: 'Valor', value: 'R$ 1.850,00' },
    { label: 'Categoria', value: 'Fertilizantes' },
    { label: 'Data', value: 'Hoje' },
  ];

  protected readonly incomeFields: readonly ParsedField[] = [
    { label: 'Tipo', value: 'Receita' },
    { label: 'Valor', value: 'R$ 18.000,00' },
    { label: 'Descrição', value: 'Venda de café' },
    { label: 'Data', value: 'Hoje' },
  ];
}
