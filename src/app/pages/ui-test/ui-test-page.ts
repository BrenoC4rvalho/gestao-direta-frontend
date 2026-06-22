import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { GdFormControl, GdSelectOption, Input, Select, Textarea } from '../../shared/forms';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '../../shared/ui';

interface UiTestForm {
  normal: GdFormControl;
  hint: GdFormControl;
  disabled: GdFormControl;
  readonly: GdFormControl;
  error: GdFormControl;
  password: GdFormControl;
  select: GdFormControl;
  textarea: GdFormControl;
}

@Component({
  selector: 'gd-ui-test-page',
  imports: [
    Badge,
    Button,
    Card,
    EmptyState,
    ErrorState,
    Input,
    ReactiveFormsModule,
    Select,
    Skeleton,
    Textarea,
  ],
  templateUrl: './ui-test-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiTestPage {
  protected readonly buttonVariants = ['primary', 'secondary', 'outline', 'ghost', 'danger'] as const;
  protected readonly buttonSizes = ['sm', 'md', 'lg'] as const;
  protected readonly cardVariants = ['default', 'elevated', 'outlined'] as const;
  protected readonly badgeVariants = ['default', 'success', 'warning', 'danger', 'info', 'neutral'] as const;
  protected readonly statusOptions: readonly GdSelectOption[] = [
    { label: 'Ativo', value: 'active' },
    { label: 'Pendente', value: 'pending' },
    { label: 'Inativo', value: 'inactive' },
  ];

  protected readonly form = new FormGroup<UiTestForm>({
    normal: new FormControl<GdFormControl['value']>('Fazenda Boa Safra'),
    hint: new FormControl<GdFormControl['value']>('Produtor rural'),
    disabled: new FormControl<GdFormControl['value']>({
      value: 'Campo bloqueado',
      disabled: true,
    }),
    readonly: new FormControl<GdFormControl['value']>('Somente leitura'),
    error: new FormControl<GdFormControl['value']>('', {
      validators: [Validators.required],
    }),
    password: new FormControl<GdFormControl['value']>('senha-segura'),
    select: new FormControl<GdFormControl['value']>('active'),
    textarea: new FormControl<GdFormControl['value']>(
      'Observação usada apenas para validar o componente visualmente.',
    ),
  });

  constructor() {
    this.form.controls.error.markAsTouched();
  }

  protected visualAction(): void {
    return;
  }
}
