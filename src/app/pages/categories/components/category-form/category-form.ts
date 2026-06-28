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
  FinancialCategoryFormType,
} from '../../../../core/models/financial-category.models';
import {
  GdFormControl,
  GdFormValue,
  GdSelectOption,
  Input,
  Select,
} from '../../../../shared/forms';
import { Button } from '../../../../shared/ui';

export type CategoryScope = 'FARM' | 'GLOBAL';

export interface CategoryFormPayload {
  name: string;
  type: FinancialCategoryFormType;
  scope?: CategoryScope;
}

interface CategoryFormControls {
  name: GdFormControl;
  type: GdFormControl;
  scope: GdFormControl;
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
  readonly showScopeField = input(false);
  readonly defaultScope = input<CategoryScope>('FARM');
  readonly typeOptions = input.required<readonly GdSelectOption[]>();

  readonly submitted = output<CategoryFormPayload>();
  readonly cancelled = output<void>();

  protected readonly editing = computed(() => this.category() !== null);
  protected readonly scopeOptions: readonly GdSelectOption[] = [
    { label: 'Fazenda selecionada', value: 'FARM' },
    { label: 'Global', value: 'GLOBAL' },
  ];
  protected readonly scopeHint = computed(() =>
    this.stringValue(this.form.controls.scope.value) === 'GLOBAL'
      ? 'Categorias globais ficam disponíveis como padrão no sistema.'
      : 'Categorias da fazenda ficam disponíveis apenas para a fazenda selecionada.',
  );

  private readonly allowedTypeValues = computed(() =>
    new Set(this.typeOptions().map((option) => this.stringValue(option.value))),
  );

  protected readonly form = new FormGroup<CategoryFormControls>({
    name: new FormControl<GdFormValue>('', {
      validators: [Validators.required],
    }),
    type: new FormControl<GdFormValue>('', {
      validators: [Validators.required],
    }),
    scope: new FormControl<GdFormValue>('FARM', {
      validators: [Validators.required],
    }),
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }

      const category = this.category();
      const type = this.stringValue(category?.type ?? '');
      const defaultScope = this.isAllowedScope(this.defaultScope())
        ? this.defaultScope()
        : 'FARM';

      this.form.reset({
        name: category?.name ?? '',
        type: this.isAllowedType(type) ? type : '',
        scope: category ? 'FARM' : defaultScope,
      });
    });
  }

  protected submit(): void {
    const name = this.stringValue(this.form.controls.name.value);
    const type = this.stringValue(this.form.controls.type.value);
    const scope = this.stringValue(this.form.controls.scope.value);

    if (!name) {
      this.form.controls.name.setErrors({ required: true });
    }

    if (!type || !this.isAllowedType(type)) {
      this.form.controls.type.setErrors({ required: true });
    }

    if (this.showScopeField() && !this.isAllowedScope(scope)) {
      this.form.controls.scope.setErrors({ required: true });
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.isCategoryFormType(type)) {
      this.form.controls.type.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }

    const payload: CategoryFormPayload = { name, type };

    if (this.showScopeField()) {
      payload.scope = this.isAllowedScope(scope) ? scope : 'FARM';
    }

    this.submitted.emit(payload);
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

  protected scopeErrorMessage(): string | null {
    return this.form.controls.scope.hasError('required')
      ? 'Selecione o escopo da categoria.'
      : null;
  }

  private isAllowedType(type: string): boolean {
    return this.allowedTypeValues().has(type);
  }

  private isCategoryFormType(type: string): type is FinancialCategoryFormType {
    return type === 'INCOME' || type === 'EXPENSE';
  }

  private isAllowedScope(scope: string): scope is CategoryScope {
    return scope === 'FARM' || scope === 'GLOBAL';
  }

  private stringValue(value: GdFormValue): string {
    return `${value ?? ''}`.trim();
  }
}
