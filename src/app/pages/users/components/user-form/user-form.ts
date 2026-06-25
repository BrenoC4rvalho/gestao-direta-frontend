import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { UserType } from '../../../../core/models/auth.models';
import { CreateUserRequest } from '../../../../core/models/user.models';
import {
  GdFormControl,
  GdFormValue,
  GdSelectOption,
  Input,
  Select,
} from '../../../../shared/forms';
import { Button } from '../../../../shared/ui';

interface UserFormControls {
  name: GdFormControl;
  email: GdFormControl;
  password: GdFormControl;
  document: GdFormControl;
  userType: GdFormControl;
}

@Component({
  selector: 'gd-user-form',
  imports: [Button, Input, ReactiveFormsModule, Select],
  templateUrl: './user-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserForm {
  readonly open = input(false);
  readonly submitting = input(false);

  readonly submitted = output<CreateUserRequest>();
  readonly cancelled = output<void>();

  protected readonly userTypeOptions: readonly GdSelectOption[] = [
    { label: 'Administrador', value: 'ADMIN' },
    { label: 'Usuário', value: 'USER' },
  ];

  protected readonly form = new FormGroup<UserFormControls>({
    name: new FormControl<GdFormValue>('', {
      validators: [Validators.required],
    }),
    email: new FormControl<GdFormValue>('', {
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl<GdFormValue>('', {
      validators: [Validators.required, Validators.minLength(8)],
    }),
    document: new FormControl<GdFormValue>(''),
    userType: new FormControl<GdFormValue>('', {
      validators: [Validators.required],
    }),
  });

  constructor() {
    effect(() => {
      this.open();
      this.form.reset({
        name: '',
        email: '',
        password: '',
        document: '',
        userType: '',
      });
    });
  }

  clearPassword(): void {
    this.form.controls.password.reset('');
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }

    const name = this.stringValue(this.form.controls.name.value);
    const email = this.stringValue(this.form.controls.email.value).toLowerCase();
    const password = this.stringValue(this.form.controls.password.value);
    const userType = this.stringValue(this.form.controls.userType.value);

    this.setRequiredErrorIfEmpty(this.form.controls.name, name);
    this.setRequiredErrorIfEmpty(this.form.controls.email, email);
    this.setRequiredErrorIfEmpty(this.form.controls.password, password);
    this.setRequiredErrorIfEmpty(this.form.controls.userType, userType);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.emit({
      name,
      email,
      password,
      document: this.nullableString(this.form.controls.document.value),
      userType: userType as UserType,
    });
  }

  protected cancel(): void {
    if (this.submitting()) {
      return;
    }

    this.form.reset();
    this.cancelled.emit();
  }

  protected nameErrorMessage(): string | null {
    return this.form.controls.name.hasError('required') ? 'Informe o nome do usuário.' : null;
  }

  protected emailErrorMessage(): string | null {
    const control = this.form.controls.email;

    if (control.hasError('required')) {
      return 'Informe o e-mail.';
    }

    return control.hasError('email') ? 'Informe um e-mail válido.' : null;
  }

  protected passwordErrorMessage(): string | null {
    const control = this.form.controls.password;

    if (control.hasError('required')) {
      return 'Informe a senha.';
    }

    return control.hasError('minlength') ? 'A senha deve ter pelo menos 8 caracteres.' : null;
  }

  protected userTypeErrorMessage(): string | null {
    return this.form.controls.userType.hasError('required')
      ? 'Selecione o tipo de usuário.'
      : null;
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
