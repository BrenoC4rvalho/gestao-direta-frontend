import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
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

import { UserStatus, UserType } from '../../../../core/models/auth.models';
import { UpdateUserRequest, User } from '../../../../core/models/user.models';
import { GdFormControl, GdFormValue, GdSelectOption, Input, Select } from '../../../../shared/forms';
import { Badge, BadgeVariant, Button } from '../../../../shared/ui';
import {
  DocumentType,
  formatCnpj,
  formatCpf,
  inferDocumentType,
  onlyDigits,
} from '../../../../shared/utils/document.utils';

interface ProfileFormControls {
  name: GdFormControl;
  email: GdFormControl;
  documentType: GdFormControl;
  document: GdFormControl;
}

interface PasswordFormControls {
  password: GdFormControl;
}

interface StatusAction {
  label: string;
  status: UserStatus;
  variant: 'outline' | 'warning' | 'danger' | 'success';
}

@Component({
  selector: 'gd-user-edit-form',
  imports: [Badge, Button, Input, ReactiveFormsModule, Select],
  templateUrl: './user-edit-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserEditForm {
  private readonly destroyRef = inject(DestroyRef);

  readonly user = input<User | null>(null);
  readonly isCurrentUser = input(false);
  readonly savingProfile = input(false);
  readonly changingType = input(false);
  readonly changingStatus = input(false);
  readonly resettingPassword = input(false);

  readonly saveProfile = output<UpdateUserRequest>();
  readonly changeType = output<UserType>();
  readonly changeStatus = output<UserStatus>();
  readonly resetPassword = output<string>();
  readonly cancel = output<void>();

  protected readonly documentTypeOptions: readonly GdSelectOption[] = [
    { label: 'CPF', value: 'CPF' },
    { label: 'CNPJ', value: 'CNPJ' },
  ];

  protected readonly profileForm = new FormGroup<ProfileFormControls>({
    name: new FormControl<GdFormValue>('', {
      validators: [Validators.required],
    }),
    email: new FormControl<GdFormValue>(''),
    documentType: new FormControl<GdFormValue>('CPF', {
      validators: [Validators.required],
    }),
    document: new FormControl<GdFormValue>('', {
      validators: [this.documentValidator()],
    }),
  });

  protected readonly passwordForm = new FormGroup<PasswordFormControls>({
    password: new FormControl<GdFormValue>('', {
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });

  protected readonly isBusy = computed(
    () =>
      this.savingProfile() ||
      this.changingType() ||
      this.changingStatus() ||
      this.resettingPassword(),
  );
  protected readonly nextType = computed<UserType>(() =>
    this.user()?.userType === 'ADMIN' ? 'USER' : 'ADMIN',
  );
  protected readonly statusActions = computed<readonly StatusAction[]>(() => {
    const currentStatus = this.user()?.status;
    const actions: readonly StatusAction[] = [
      { label: 'Ativar', status: 'ACTIVE', variant: 'success' },
      { label: 'Bloquear', status: 'BLOCKED', variant: 'danger' },
      { label: 'Inativar', status: 'INACTIVE', variant: 'warning' },
    ];

    return actions.filter((action) => action.status !== currentStatus);
  });

  constructor() {
    this.profileForm.controls.document.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyDocumentMask());
    this.profileForm.controls.documentType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.applyDocumentMask();
        this.profileForm.controls.document.updateValueAndValidity({ emitEvent: false });
      });

    effect(() => {
      const user = this.user();
      const documentType = inferDocumentType(user?.document) ?? 'CPF';

      this.profileForm.reset({
        name: user?.name ?? '',
        email: user?.email ?? '',
        documentType,
        document: this.formatDocument(user?.document ?? '', documentType),
      });
      this.profileForm.controls.email.disable({ emitEvent: false });
      this.passwordForm.reset({ password: '' });
    });
  }

  clearPassword(): void {
    this.passwordForm.controls.password.reset('');
  }

  protected submitProfile(): void {
    if (this.savingProfile()) {
      return;
    }

    const name = this.stringValue(this.profileForm.controls.name.value);
    this.profileForm.controls.document.updateValueAndValidity({ emitEvent: false });
    this.setRequiredErrorIfEmpty(this.profileForm.controls.name, name);
    this.setRequiredErrorIfEmpty(this.profileForm.controls.documentType, this.documentType());

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.saveProfile.emit({
      name,
      document: this.documentPayload(),
    });
  }

  protected requestTypeChange(): void {
    if (!this.isBusy() && !this.isCurrentUser()) {
      this.changeType.emit(this.nextType());
    }
  }

  protected requestStatusChange(status: UserStatus): void {
    if (!this.isBusy() && !this.isCurrentUser()) {
      this.changeStatus.emit(status);
    }
  }

  protected submitPassword(): void {
    if (this.resettingPassword() || this.isCurrentUser()) {
      return;
    }

    const password = this.stringValue(this.passwordForm.controls.password.value);
    this.setRequiredErrorIfEmpty(this.passwordForm.controls.password, password);

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.resetPassword.emit(password);
  }

  protected cancelEdit(): void {
    if (!this.isBusy()) {
      this.cancel.emit();
    }
  }

  protected nameErrorMessage(): string | null {
    return this.profileForm.controls.name.hasError('required')
      ? 'Informe o nome do usuário.'
      : null;
  }

  protected documentErrorMessage(): string | null {
    const control = this.profileForm.controls.document;

    if (control.hasError('cpfLength')) {
      return 'CPF deve conter 11 dígitos.';
    }

    return control.hasError('cnpjLength') ? 'CNPJ deve conter 14 dígitos.' : null;
  }

  protected passwordErrorMessage(): string | null {
    const control = this.passwordForm.controls.password;

    if (control.hasError('required')) {
      return 'Informe a senha temporária.';
    }

    return control.hasError('minlength') ? 'A senha deve ter pelo menos 8 caracteres.' : null;
  }

  protected userTypeLabel(type: UserType | undefined): string {
    const labels: Record<string, string> = {
      ADMIN: 'Administrador',
      USER: 'Usuário',
    };

    return type ? (labels[type] ?? type) : 'Não informado';
  }

  protected statusLabel(status: UserStatus | undefined): string {
    const labels: Record<string, string> = {
      ACTIVE: 'Ativo',
      INACTIVE: 'Inativo',
      BLOCKED: 'Bloqueado',
    };

    return status ? (labels[status] ?? status) : 'Não informado';
  }

  protected userTypeVariant(type: UserType | undefined): BadgeVariant {
    return type === 'ADMIN' ? 'info' : 'neutral';
  }

  protected statusVariant(status: UserStatus | undefined): BadgeVariant {
    const variants: Record<string, BadgeVariant> = {
      ACTIVE: 'success',
      INACTIVE: 'neutral',
      BLOCKED: 'danger',
    };

    return status ? (variants[status] ?? 'info') : 'neutral';
  }

  private applyDocumentMask(): void {
    const control = this.profileForm.controls.document;
    const digits = onlyDigits(control.value).slice(0, this.documentMaxLength());
    const formatted = this.formatDocument(digits, this.documentType());

    if (control.value !== formatted) {
      control.setValue(formatted, { emitEvent: false });
    }
  }

  private formatDocument(value: GdFormValue, documentType: DocumentType): string {
    return documentType === 'CNPJ' ? formatCnpj(value) : formatCpf(value);
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
    return this.profileForm.controls.documentType.value === 'CNPJ' ? 'CNPJ' : 'CPF';
  }

  private documentMaxLength(): number {
    return this.documentType() === 'CNPJ' ? 14 : 11;
  }

  private documentPayload(): string | null {
    return onlyDigits(this.profileForm.controls.document.value) || null;
  }

  private setRequiredErrorIfEmpty(control: GdFormControl, value: string): void {
    if (!value) {
      control.setErrors({ ...control.errors, required: true });
    }
  }

  private stringValue(value: GdFormValue): string {
    return `${value ?? ''}`.trim();
  }
}
