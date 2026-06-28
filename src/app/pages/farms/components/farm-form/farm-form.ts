import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { CreateFarmRequest, Farm, ProductionType } from '../../../../core/models/farm.models';
import {
  GdFormControl,
  GdFormValue,
  GdSelectOption,
  Input,
  Select,
} from '../../../../shared/forms';
import { Button } from '../../../../shared/ui';
import {
  DocumentType,
  formatCnpj,
  formatCpf,
  inferDocumentType,
  onlyDigits,
} from '../../../../shared/utils/document.utils';

interface FarmFormControls {
  name: GdFormControl;
  documentType: GdFormControl;
  document: GdFormControl;
  city: GdFormControl;
  state: GdFormControl;
  totalArea: GdFormControl;
  productionType: GdFormControl;
}

@Component({
  selector: 'gd-farm-form',
  imports: [Button, Input, ReactiveFormsModule, Select],
  templateUrl: './farm-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmForm {
  private readonly destroyRef = inject(DestroyRef);

  readonly farm = input<Farm | null>(null);
  readonly open = input(false);
  readonly submitting = input(false);

  readonly submitted = output<CreateFarmRequest>();
  readonly cancelled = output<void>();

  protected readonly productionTypeOptions: readonly GdSelectOption[] = [
    { label: 'Agricultura', value: 'AGRICULTURE' },
    { label: 'Pecuária', value: 'LIVESTOCK' },
    { label: 'Mista', value: 'MIXED' },
    { label: 'Outra', value: 'OTHER' },
  ];
  protected readonly documentTypeOptions: readonly GdSelectOption[] = [
    { label: 'CPF', value: 'CPF' },
    { label: 'CNPJ', value: 'CNPJ' },
  ];

  protected readonly form = new FormGroup<FarmFormControls>({
    name: new FormControl<GdFormValue>('', {
      validators: [Validators.required],
    }),
    documentType: new FormControl<GdFormValue>('CNPJ', {
      validators: [Validators.required],
    }),
    document: new FormControl<GdFormValue>('', {
      validators: [this.documentValidator()],
    }),
    city: new FormControl<GdFormValue>(''),
    state: new FormControl<GdFormValue>('', {
      validators: [Validators.maxLength(2)],
    }),
    totalArea: new FormControl<GdFormValue>(null, {
      validators: [Validators.min(0)],
    }),
    productionType: new FormControl<GdFormValue>(''),
  });

  constructor() {
    this.form.controls.document.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyDocumentMask());
    this.form.controls.documentType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.applyDocumentMask();
        this.form.controls.document.updateValueAndValidity({ emitEvent: false });
      });

    effect(() => {
      if (!this.open()) {
        return;
      }

      const farm = this.farm();
      const documentType = inferDocumentType(farm?.document) ?? 'CNPJ';
      this.form.reset({
        name: farm?.name ?? '',
        documentType,
        document: farm?.document ?? '',
        city: farm?.city ?? '',
        state: farm?.state ?? '',
        totalArea: farm?.totalArea ?? null,
        productionType: farm?.productionType ?? '',
      });
      this.applyDocumentMask();
      this.form.controls.document.updateValueAndValidity({ emitEvent: false });
    });
  }

  protected submit(): void {
    const name = this.stringValue(this.form.controls.name.value);

    if (!name) {
      this.form.controls.name.setErrors({ required: true });
    }

    this.form.controls.document.updateValueAndValidity({ emitEvent: false });

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.emit({
      name,
      document: this.documentPayload(),
      city: this.nullableString(this.form.controls.city.value),
      state: this.nullableString(this.form.controls.state.value)?.toUpperCase() ?? null,
      totalArea: this.nullableNumber(this.form.controls.totalArea.value),
      productionType: this.nullableString(
        this.form.controls.productionType.value,
      ) as ProductionType | null,
    });
  }

  protected cancel(): void {
    if (!this.submitting()) {
      this.cancelled.emit();
    }
  }

  protected nameErrorMessage(): string | null {
    return this.form.controls.name.hasError('required') ? 'Informe o nome da fazenda.' : null;
  }

  protected stateErrorMessage(): string | null {
    return this.form.controls.state.hasError('maxlength')
      ? 'Informe uma UF com até 2 letras.'
      : null;
  }

  protected areaErrorMessage(): string | null {
    return this.form.controls.totalArea.hasError('min')
      ? 'Informe uma área igual ou maior que zero.'
      : null;
  }

  protected documentErrorMessage(): string | null {
    const control = this.form.controls.document;

    if (control.hasError('cpfLength')) {
      return 'CPF deve conter 11 dígitos.';
    }

    return control.hasError('cnpjLength') ? 'CNPJ deve conter 14 dígitos.' : null;
  }

  private applyDocumentMask(): void {
    const control = this.form.controls.document;
    const digits = onlyDigits(control.value).slice(0, this.documentMaxLength());
    const formatted = this.documentType() === 'CNPJ' ? formatCnpj(digits) : formatCpf(digits);

    if (control.value !== formatted) {
      control.setValue(formatted, { emitEvent: false });
    }
  }

  private documentValidator(): (control: AbstractControl<GdFormValue>) => ValidationErrors | null {
    return (control: AbstractControl<GdFormValue>): ValidationErrors | null => {
      const digits = onlyDigits(control.value);

      if (!digits) {
        return null;
      }

      if (this.documentType() === 'CNPJ') {
        return digits.length === 14 ? null : { cnpjLength: true };
      }

      return digits.length === 11 ? null : { cpfLength: true };
    };
  }

  private documentType(): DocumentType {
    return this.form.controls.documentType.value === 'CPF' ? 'CPF' : 'CNPJ';
  }

  private documentMaxLength(): number {
    return this.documentType() === 'CNPJ' ? 14 : 11;
  }

  private documentPayload(): string | null {
    return onlyDigits(this.form.controls.document.value) || null;
  }

  private stringValue(value: GdFormValue): string {
    return `${value ?? ''}`.trim();
  }

  private nullableString(value: GdFormValue): string | null {
    return this.stringValue(value) || null;
  }

  private nullableNumber(value: GdFormValue): number | null {
    if (value === null || value === '') {
      return null;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }
}
