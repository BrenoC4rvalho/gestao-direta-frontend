import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  FinancialCategory,
  isGlobalCategory,
} from '../../../../core/models/financial-category.models';
import {
  FinancialTransaction,
  PaymentMethod,
  PaymentStatus,
  TransactionType,
  UpdateFinancialTransactionRequest,
} from '../../../../core/models/financial-transaction.models';
import {
  GdFormControl,
  GdFormValue,
  GdSelectOption,
  Input,
  Select,
  Textarea,
} from '../../../../shared/forms';
import { Button } from '../../../../shared/ui';

interface TransactionFormControls {
  description: GdFormControl;
  type: GdFormControl;
  amount: GdFormControl;
  categoryId: GdFormControl;
  transactionDate: GdFormControl;
  dueDate: GdFormControl;
  paidAt: GdFormControl;
  status: GdFormControl;
  paymentMethod: GdFormControl;
  notes: GdFormControl;
}

@Component({
  selector: 'gd-transaction-form',
  imports: [Button, Input, ReactiveFormsModule, Select, Textarea],
  templateUrl: './transaction-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionForm {
  private readonly destroyRef = inject(DestroyRef);

  readonly transaction = input<FinancialTransaction | null>(null);
  readonly categories = input.required<readonly FinancialCategory[]>();
  readonly open = input(false);
  readonly submitting = input(false);

  readonly submitted = output<UpdateFinancialTransactionRequest>();
  readonly cancelled = output<void>();

  protected readonly selectedType = signal<TransactionType>('EXPENSE');
  protected readonly editing = computed(() => this.transaction() !== null);

  protected readonly typeOptions: readonly GdSelectOption[] = [
    { label: 'Receita', value: 'INCOME' },
    { label: 'Despesa', value: 'EXPENSE' },
  ];
  protected readonly statusOptions: readonly GdSelectOption[] = [
    { label: 'Pendente', value: 'PENDING' },
    { label: 'Paga', value: 'PAID' },
    { label: 'Atrasada', value: 'OVERDUE' },
    { label: 'Cancelada', value: 'CANCELED' },
  ];
  protected readonly paymentMethodOptions: readonly GdSelectOption[] = [
    { label: 'Pix', value: 'PIX' },
    { label: 'Dinheiro', value: 'CASH' },
    { label: 'Cartão de crédito', value: 'CREDIT_CARD' },
    { label: 'Cartão de débito', value: 'DEBIT_CARD' },
    { label: 'Transferência bancária', value: 'BANK_TRANSFER' },
    { label: 'Boleto', value: 'BOLETO' },
    { label: 'Cheque', value: 'CHECK' },
    { label: 'Outro', value: 'OTHER' },
  ];

  protected readonly categoryOptions = computed<readonly GdSelectOption[]>(() => {
    const type = this.selectedType();

    return this.categories()
      .filter((category) => category.status === 'ACTIVE')
      .filter((category) => category.type === type || isGlobalCategory(category))
      .map((category) => ({ label: category.name, value: category.id }));
  });

  protected readonly form = new FormGroup<TransactionFormControls>({
    description: new FormControl<GdFormValue>('', { validators: [Validators.required] }),
    type: new FormControl<GdFormValue>('EXPENSE', { validators: [Validators.required] }),
    amount: new FormControl<GdFormValue>('', {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    categoryId: new FormControl<GdFormValue>(''),
    transactionDate: new FormControl<GdFormValue>('', { validators: [Validators.required] }),
    dueDate: new FormControl<GdFormValue>(''),
    paidAt: new FormControl<GdFormValue>(''),
    status: new FormControl<GdFormValue>('PENDING', { validators: [Validators.required] }),
    paymentMethod: new FormControl<GdFormValue>(''),
    notes: new FormControl<GdFormValue>(''),
  });

  constructor() {
    this.form.controls.type.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const type = this.stringValue(value) || 'EXPENSE';
        this.selectedType.set(type);
        this.form.controls.categoryId.setValue('', { emitEvent: false });
      });

    effect(() => {
      if (!this.open()) {
        return;
      }

      const transaction = this.transaction();
      const type = transaction?.type ?? 'EXPENSE';
      this.selectedType.set(type);
      this.form.reset({
        description: transaction?.description ?? '',
        type,
        amount: transaction?.amount ?? '',
        categoryId: transaction?.categoryId ?? '',
        transactionDate: transaction?.transactionDate ?? this.currentDate(),
        dueDate: transaction?.dueDate ?? '',
        paidAt: transaction?.paidAt ?? '',
        status: transaction?.status ?? 'PENDING',
        paymentMethod: transaction?.paymentMethod ?? '',
        notes: transaction?.notes ?? '',
      });
    });
  }

  protected submit(): void {
    const description = this.stringValue(this.form.controls.description.value);
    const type = this.stringValue(this.form.controls.type.value) as TransactionType;
    const amount = Number(this.form.controls.amount.value);
    const categoryId = this.numberOrNull(this.form.controls.categoryId.value);
    const transactionDate = this.stringValue(this.form.controls.transactionDate.value);
    const dueDate = this.nullableString(this.form.controls.dueDate.value);
    const paidAt = this.nullableString(this.form.controls.paidAt.value);
    const status = this.stringValue(this.form.controls.status.value) as PaymentStatus;
    const paymentMethod = this.nullableString(
      this.form.controls.paymentMethod.value,
    ) as PaymentMethod | null;
    const notes = this.nullableString(this.form.controls.notes.value);

    this.validateRequiredFields(description, type, amount, transactionDate, status, categoryId);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.emit({
      description,
      amount,
      type,
      status,
      paymentMethod,
      transactionDate,
      dueDate,
      paidAt,
      notes,
      categoryId,
    });
  }

  protected cancel(): void {
    if (!this.submitting()) {
      this.cancelled.emit();
    }
  }

  protected categoryRequired(): boolean {
    return this.categoryOptions().length > 0;
  }

  protected descriptionErrorMessage(): string | null {
    return this.form.controls.description.hasError('required')
      ? 'Informe a descrição.'
      : null;
  }

  protected typeErrorMessage(): string | null {
    return this.form.controls.type.hasError('required') ? 'Selecione o tipo.' : null;
  }

  protected amountErrorMessage(): string | null {
    const control = this.form.controls.amount;

    if (control.hasError('required')) {
      return 'Informe o valor.';
    }

    return control.hasError('min') ? 'Informe um valor maior que zero.' : null;
  }

  protected categoryErrorMessage(): string | null {
    return this.form.controls.categoryId.hasError('required')
      ? 'Selecione a categoria.'
      : null;
  }

  protected transactionDateErrorMessage(): string | null {
    return this.form.controls.transactionDate.hasError('required')
      ? 'Informe a data da movimentação.'
      : null;
  }

  protected statusErrorMessage(): string | null {
    return this.form.controls.status.hasError('required') ? 'Selecione o status.' : null;
  }

  private validateRequiredFields(
    description: string,
    type: string,
    amount: number,
    transactionDate: string,
    status: string,
    categoryId: number | null,
  ): void {
    if (!description) {
      this.form.controls.description.setErrors({ required: true });
    }

    if (!type) {
      this.form.controls.type.setErrors({ required: true });
    }

    if (!amount) {
      this.form.controls.amount.setErrors({ required: true });
    } else if (amount <= 0) {
      this.form.controls.amount.setErrors({ min: true });
    }

    if (this.categoryRequired() && categoryId === null) {
      this.form.controls.categoryId.setErrors({ required: true });
    }

    if (!transactionDate) {
      this.form.controls.transactionDate.setErrors({ required: true });
    }

    if (!status) {
      this.form.controls.status.setErrors({ required: true });
    }
  }

  private currentDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private stringValue(value: GdFormValue): string {
    return `${value ?? ''}`.trim();
  }

  private nullableString(value: GdFormValue): string | null {
    const text = this.stringValue(value);
    return text || null;
  }

  private numberOrNull(value: GdFormValue): number | null {
    if (value === null || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
