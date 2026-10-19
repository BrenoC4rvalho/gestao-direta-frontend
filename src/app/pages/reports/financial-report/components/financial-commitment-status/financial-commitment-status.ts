import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import {
  FinancialCommitmentSegment,
  FinancialCommitmentStatus,
} from '../../../../../core/models/financial-report.models';
import { BrCurrencyPipe } from '../../../../../shared/pipes/br-currency.pipe';

@Component({
  selector: 'gd-financial-commitment-status',
  templateUrl: './financial-commitment-status.html',
  styleUrl: '../../../../../../styles/financial-commitment-status.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialCommitmentStatusComponent {
  readonly status = input<FinancialCommitmentStatus | null>(null);
  readonly historyStartDate = input<string | null>(null);
  readonly historyEndDate = input<string | null>(null);
  readonly loading = input(false);
  readonly error = input(false);
  readonly retry = output<void>();
  readonly segmentSelected = output<FinancialCommitmentSegment>();

  private readonly currencyPipe = new BrCurrencyPipe();
  protected formatCurrency(value: number): string {
    return this.currencyPipe.transform(value);
  }

  protected formatRate(value: number | null): string {
    return value === null ? 'Sem dados' : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
  }

  protected formatDate(value: string | null): string {
    if (!value) return 'período selecionado';
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
      new Date(`${value}T00:00:00Z`),
    );
  }

  protected progressWidth(value: number | null): number {
    return value === null ? 0 : Math.min(Math.max(value, 0), 100);
  }

  protected select(segment: FinancialCommitmentSegment): void {
    this.segmentSelected.emit(segment);
  }

}
