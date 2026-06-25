import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CreateFarmRequest, Farm, ProductionType } from '../../../../core/models/farm.models';
import {
  GdFormControl,
  GdFormValue,
  GdSelectOption,
  Input,
  Select,
} from '../../../../shared/forms';
import { Button } from '../../../../shared/ui';

interface FarmFormControls {
  name: GdFormControl;
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

  protected readonly form = new FormGroup<FarmFormControls>({
    name: new FormControl<GdFormValue>('', {
      validators: [Validators.required],
    }),
    document: new FormControl<GdFormValue>(''),
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
    effect(() => {
      if (!this.open()) {
        return;
      }

      const farm = this.farm();
      this.form.reset({
        name: farm?.name ?? '',
        document: farm?.document ?? '',
        city: farm?.city ?? '',
        state: farm?.state ?? '',
        totalArea: farm?.totalArea ?? null,
        productionType: farm?.productionType ?? '',
      });
    });
  }

  protected submit(): void {
    const name = this.stringValue(this.form.controls.name.value);

    if (!name) {
      this.form.controls.name.setErrors({ required: true });
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.emit({
      name,
      document: this.nullableString(this.form.controls.document.value),
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
    return this.form.controls.state.hasError('maxlength') ? 'Informe uma UF com até 2 letras.' : null;
  }

  protected areaErrorMessage(): string | null {
    return this.form.controls.totalArea.hasError('min') ? 'Informe uma área igual ou maior que zero.' : null;
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
