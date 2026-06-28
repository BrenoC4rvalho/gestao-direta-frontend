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
import {
  DocumentType,
  formatCnpj,
  formatCpf,
  onlyDigits,
} from '../../../../shared/utils/document.utils';

interface UserFormControls {
  name: GdFormControl;
  email: GdFormControl;
  password: GdFormControl;
  documentType: GdFormControl;
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
  private readonly destroyRef = inject(DestroyRef);

  readonly open = input(false);
  readonly submitting = input(false);
  readonly allowedUserTypes = input<readonly UserType[]>(['USER', 'ADMIN']);

  readonly submitted = output<CreateUserRequest>();
  readonly cancelled = output<void>();

  protected readonly userTypeOptions = computed<readonly GdSelectOption[]>(() =>
    this.allowedUserTypes().map((type) => ({ label: this.userTypeLabel(type), value: type })),
  );
  protected readonly documentTypeOptions: readonly GdSelectOption[] = [
    { label: 'CPF', value: 'CPF' },
    { label: 'CNPJ', value: 'CNPJ' },
  ];
  protected readonly showUserTypeSelect = computed(() => this.allowedUserTypes().length > 1);

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
    documentType: new FormControl<GdFormValue>('CPF', {
      validators: [Validators.required],
    }),
    document: new FormControl<GdFormValue>('', {
      validators: [this.documentValidator()],
    }),
    userType: new FormControl<GdFormValue>('', {
      validators: [Validators.required],
    }),
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
      this.open();
      const [defaultType = 'USER'] = this.allowedUserTypes();
      this.form.reset({
        name: '',
        email: '',
        password: '',
        documentType: 'CPF',
        document: '',
        userType: this.showUserTypeSelect() ? '' : defaultType,
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
    const allowedUserTypes = this.allowedUserTypes();
    const selectedUserType = this.stringValue(this.form.controls.userType.value) as UserType;
    const userType = this.normalizedUserType(selectedUserType, allowedUserTypes);

    this.form.controls.userType.setValue(userType);
    this.form.controls.document.updateValueAndValidity({ emitEvent: false });

    this.setRequiredErrorIfEmpty(this.form.controls.name, name);
    this.setRequiredErrorIfEmpty(this.form.controls.email, email);
    this.setRequiredErrorIfEmpty(this.form.controls.password, password);
    this.setRequiredErrorIfEmpty(this.form.controls.documentType, this.documentType());
    this.setRequiredErrorIfEmpty(this.form.controls.userType, userType);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.emit({
      name,
      email,
      password,
      document: this.documentPayload(),
      userType,
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
    return this.form.controls.documentType.value === 'CNPJ' ? 'CNPJ' : 'CPF';
  }

  private documentMaxLength(): number {
    return this.documentType() === 'CNPJ' ? 14 : 11;
  }

  private documentPayload(): string | null {
    return onlyDigits(this.form.controls.document.value) || null;
  }

  private normalizedUserType(
    selectedUserType: UserType | '',
    allowedUserTypes: readonly UserType[],
  ): UserType | '' {
    if (allowedUserTypes.includes(selectedUserType as UserType)) {
      return selectedUserType as UserType;
    }

    if (!selectedUserType && this.showUserTypeSelect()) {
      return '';
    }

    return allowedUserTypes[0] ?? 'USER';
  }

  private userTypeLabel(type: UserType): string {
    const labels: Record<string, string> = {
      ADMIN: 'Administrador',
      USER: 'Usuário',
    };

    return labels[type] ?? type;
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
