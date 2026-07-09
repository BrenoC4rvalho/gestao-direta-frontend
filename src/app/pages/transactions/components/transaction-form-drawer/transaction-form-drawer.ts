import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { HarvestSeason } from '../../../../core/models/harvest-season.models';
import { FinancialCategory } from '../../../../core/models/financial-category.models';
import {
  FinancialTransaction,
  FinancialTransactionDraft,
  UpdateFinancialTransactionRequest,
} from '../../../../core/models/financial-transaction.models';
import { Drawer } from '../../../../shared/overlays';
import { TransactionForm } from '../transaction-form/transaction-form';

@Component({
  selector: 'gd-transaction-form-drawer',
  imports: [Drawer, TransactionForm],
  templateUrl: './transaction-form-drawer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionFormDrawer {
  readonly open = input(false);
  readonly title = input('Nova movimentação');
  readonly description = input('Registre uma receita ou despesa da fazenda selecionada.');
  readonly transaction = input<FinancialTransaction | null>(null);
  readonly draft = input<FinancialTransactionDraft | null>(null);
  readonly categories = input.required<readonly FinancialCategory[]>();
  readonly harvestSeasons = input<readonly HarvestSeason[]>([]);
  readonly warnings = input<readonly string[]>([]);
  readonly submitting = input(false);

  readonly submitted = output<UpdateFinancialTransactionRequest>();
  readonly cancelled = output<void>();
  readonly closed = output<void>();
}
