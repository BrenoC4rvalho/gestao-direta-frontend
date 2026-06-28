import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  CreateFarmUserRequest,
  FarmUserRole,
} from '../../../../core/models/farm-user.models';
import { User } from '../../../../core/models/user.models';
import {
  GdFormControl,
  GdFormValue,
  GdSelectOption,
  Input,
  Select,
} from '../../../../shared/forms';
import { Button } from '../../../../shared/ui';

export type FarmUserFormMode = 'admin-list' | 'email-search';

interface FarmUserFormControls {
  email: GdFormControl;
  userId: GdFormControl;
  role: GdFormControl;
}

@Component({
  selector: 'gd-farm-user-form',
  imports: [Button, Input, ReactiveFormsModule, Select],
  templateUrl: './farm-user-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmUserForm {
  private readonly destroyRef = inject(DestroyRef);

  readonly open = input(false);
  readonly mode = input<FarmUserFormMode>('admin-list');
  readonly users = input<readonly User[]>([]);
  readonly foundUser = input<User | null>(null);
  readonly roles = input.required<readonly FarmUserRole[]>();
  readonly submitting = input(false);
  readonly searchLoading = input(false);
  readonly searchError = input<string | null>(null);

  readonly searchEmail = output<string>();
  readonly emailChanged = output<void>();
  readonly submitted = output<CreateFarmUserRequest>();
  readonly cancelled = output<void>();

  protected readonly userOptions = computed<readonly GdSelectOption[]>(() =>
    this.users().map((user) => ({
      label: `${user.name} — ${user.email}`,
      value: user.id,
    })),
  );
  protected readonly roleOptions = computed<readonly GdSelectOption[]>(() =>
    this.roles().map((role) => ({ label: this.roleLabel(role), value: role })),
  );

  protected readonly form = new FormGroup<FarmUserFormControls>({
    email: new FormControl<GdFormValue>('', { validators: [Validators.required, Validators.email] }),
    userId: new FormControl<GdFormValue>('', { validators: [Validators.required] }),
    role: new FormControl<GdFormValue>('', { validators: [Validators.required] }),
  });

  constructor() {
    effect(() => {
      this.open();
      this.mode();
      this.form.reset({ email: '', userId: '', role: '' });
    });

    effect(() => {
      const user = this.foundUser();

      if (user || this.mode() === 'email-search') {
        this.form.controls.userId.setValue('', { emitEvent: false });
      }
    });

    this.form.controls.email.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.form.controls.userId.setValue('', { emitEvent: false });
        this.emailChanged.emit();
      });

    this.form.controls.userId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (this.mode() === 'admin-list' && value) {
          this.emailChanged.emit();
        }
      });
  }

  protected requestSearch(): void {
    if (this.submitting() || this.searchLoading()) {
      return;
    }

    const email = this.stringValue(this.form.controls.email.value).toLowerCase();
    this.setRequiredErrorIfEmpty(this.form.controls.email, email);

    if (this.form.controls.email.invalid) {
      this.form.controls.email.markAsTouched();
      return;
    }

    this.searchEmail.emit(email);
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }

    const userId = this.activeUserId();

    if (!userId || this.form.controls.role.invalid) {
      if (!userId) {
        this.form.controls.userId.markAsTouched();
      }
      this.form.controls.role.markAsTouched();
      return;
    }

    this.submitted.emit({
      userId: Number(userId),
      role: `${this.form.controls.role.value ?? ''}` as FarmUserRole,
    });
  }


  protected submitDisabled(): boolean {
    if (this.submitting()) {
      return true;
    }

    return !this.activeUserId() || this.form.controls.role.invalid;
  }

  protected cancel(): void {
    if (!this.submitting()) {
      this.cancelled.emit();
    }
  }

  protected emailErrorMessage(): string | null {
    const control = this.form.controls.email;

    if (control.hasError('required')) {
      return 'Informe o e-mail.';
    }

    return control.hasError('email') ? 'Informe um e-mail válido.' : null;
  }

  protected userErrorMessage(): string | null {
    return this.form.controls.userId.hasError('required')
      ? 'Selecione ou pesquise um usuário para vincular.'
      : null;
  }

  protected roleErrorMessage(): string | null {
    return this.form.controls.role.hasError('required')
      ? 'Selecione o papel na fazenda.'
      : null;
  }

  private activeUserId(): number | string | boolean | null {
    return this.foundUser()?.id ?? this.form.controls.userId.value;
  }

  private roleLabel(role: FarmUserRole): string {
    const labels: Record<string, string> = {
      PRODUCER: 'Produtor',
      EMPLOYEE: 'Funcionário',
      ACCOUNTANT: 'Contador',
    };

    return labels[role] ?? role;
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
