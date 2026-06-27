import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  FinancialCategory,
  UpdateFinancialCategoryRequest,
} from '../../../../core/models/financial-category.models';
import {
  GdFormControl,
  GdFormValue,
  GdSelectOption,
  Input,
  Select,
} from '../../../../shared/forms';
import { Button } from '../../../../shared/ui';

interface CategoryFormControls {
  name: GdFormControl;
  type: GdFormControl;
}

@Component({
  selector: 'gd-category-form',
  imports: [Button, Input, ReactiveFormsModule, Select],
  templateUrl: './category-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryForm {
  readonly category = input<FinancialCategory | null>(null);
  readonly open = input(false);
  readonly submitting = input(false);
  readonly typeOptions = input.required<readonly GdSelectOption[]>();

  readonly submitted = output<UpdateFinancialCategoryRequest>();
  readonly cancelled = output<void>();

  protected readonly editing = computed(() => this.category() !== null);

  protected readonly form = new FormGroup<CategoryFormControls>({
    name: new FormControl<GdFormValue>('', {
      validators: [Validators.required],
    }),
    type: new FormControl<GdFormValue>('', {
      validators: [Validators.required],
    }),
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }

      const category = this.category();
      this.form.reset({
        name: category?.name ?? '',
        type: category?.type ?? '',
      });
    });
  }

  protected submit(): void {
    const name = this.stringValue(this.form.controls.name.value);
    const type = this.stringValue(this.form.controls.type.value);

    if (!name) {
      this.form.controls.name.setErrors({ required: true });
    }

    if (!type) {
      this.form.controls.type.setErrors({ required: true });
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.emit({ name, type });
  }

  protected cancel(): void {
    if (!this.submitting()) {
      this.cancelled.emit();
    }
  }

  protected nameErrorMessage(): string | null {
    return this.form.controls.name.hasError('required')
      ? 'Informe o nome da categoria.'
      : null;
  }

  protected typeErrorMessage(): string | null {
    return this.form.controls.type.hasError('required')
      ? 'Selecione o tipo da categoria.'
      : null;
  }

  private stringValue(value: GdFormValue): string {
    return `${value ?? ''}`.trim();
  }
}
