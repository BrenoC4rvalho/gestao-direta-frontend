import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ToastStore } from '../../core/stores/toast.store';
import { GdFormControl, GdSelectOption, Input, Select, Textarea } from '../../shared/forms';
import { ConfirmDialog, Drawer } from '../../shared/overlays';
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
    ConfirmDialog,
    Drawer,
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
  private readonly toastStore = inject(ToastStore);

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
  protected readonly isRightDrawerOpen = signal(false);
  protected readonly isBottomDrawerOpen = signal(false);
  protected readonly isDangerConfirmOpen = signal(false);
  protected readonly isWarningConfirmOpen = signal(false);

  constructor() {
    this.form.controls.error.markAsTouched();
  }

  protected visualAction(): void {
    return;
  }

  protected openRightDrawer(): void {
    this.isRightDrawerOpen.set(true);
  }

  protected closeRightDrawer(): void {
    this.isRightDrawerOpen.set(false);
  }

  protected openBottomDrawer(): void {
    this.isBottomDrawerOpen.set(true);
  }

  protected closeBottomDrawer(): void {
    this.isBottomDrawerOpen.set(false);
  }

  protected openDangerConfirm(): void {
    this.isDangerConfirmOpen.set(true);
  }

  protected closeDangerConfirm(): void {
    this.isDangerConfirmOpen.set(false);
  }

  protected openWarningConfirm(): void {
    this.isWarningConfirmOpen.set(true);
  }

  protected closeWarningConfirm(): void {
    this.isWarningConfirmOpen.set(false);
  }

  protected confirmDangerAction(): void {
    this.closeDangerConfirm();
    this.toastStore.error('Ação confirmada', 'Exemplo de confirmação danger.');
  }

  protected confirmWarningAction(): void {
    this.closeWarningConfirm();
    this.toastStore.warning('Atenção confirmada', 'Exemplo de confirmação warning.');
  }

  protected showSuccessToast(): void {
    this.toastStore.success('Operação concluída', 'Toast de sucesso disparado pela página de teste.');
  }

  protected showErrorToast(): void {
    this.toastStore.error('Não foi possível concluir', 'Toast de erro disparado pela página de teste.');
  }

  protected showWarningToast(): void {
    this.toastStore.warning('Verifique os dados', 'Toast de alerta disparado pela página de teste.');
  }

  protected showInfoToast(): void {
    this.toastStore.info('Informação disponível', 'Toast informativo disparado pela página de teste.');
  }
}
