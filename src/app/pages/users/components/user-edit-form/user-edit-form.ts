import { ChangeDetectionStrategy, Component, computed, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { UserStatus, UserType } from '../../../../core/models/auth.models';
import { UpdateUserRequest, User } from '../../../../core/models/user.models';
import { GdFormControl, GdFormValue, Input } from '../../../../shared/forms';
import { Badge, BadgeVariant, Button } from '../../../../shared/ui';

interface ProfileFormControls {
  name: GdFormControl;
  email: GdFormControl;
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
  imports: [Badge, Button, Input, ReactiveFormsModule],
  templateUrl: './user-edit-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserEditForm {
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

  protected readonly profileForm = new FormGroup<ProfileFormControls>({
    name: new FormControl<GdFormValue>('', {
      validators: [Validators.required],
    }),
    email: new FormControl<GdFormValue>(''),
    document: new FormControl<GdFormValue>(''),
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
    effect(() => {
      const user = this.user();

      this.profileForm.reset({
        name: user?.name ?? '',
        email: user?.email ?? '',
        document: user?.document ?? '',
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
    this.setRequiredErrorIfEmpty(this.profileForm.controls.name, name);

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.saveProfile.emit({
      name,
      document: this.nullableString(this.profileForm.controls.document.value),
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

  private setRequiredErrorIfEmpty(control: GdFormControl, value: string): void {
    if (!value) {
      control.setErrors({ ...control.errors, required: true });
    }
  }

  private stringValue(value: GdFormValue): string {
    return `${value ?? ''}`.trim();
  }

  private nullableString(value: GdFormValue): string | null {
    return this.stringValue(value) || null;
  }
}
