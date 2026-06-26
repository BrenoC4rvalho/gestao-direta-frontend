import { ChangeDetectionStrategy, Component, computed, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  CreateFarmUserRequest,
  FarmUserRole,
} from '../../../../core/models/farm-user.models';
import { User } from '../../../../core/models/user.models';
import {
  GdFormControl,
  GdFormValue,
  GdSelectOption,
  Select,
} from '../../../../shared/forms';
import { Button } from '../../../../shared/ui';

interface FarmUserFormControls {
  userId: GdFormControl;
  role: GdFormControl;
}

@Component({
  selector: 'gd-farm-user-form',
  imports: [Button, ReactiveFormsModule, Select],
  templateUrl: './farm-user-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmUserForm {
  readonly open = input(false);
  readonly users = input.required<readonly User[]>();
  readonly roles = input.required<readonly FarmUserRole[]>();
  readonly submitting = input(false);

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
    userId: new FormControl<GdFormValue>('', { validators: [Validators.required] }),
    role: new FormControl<GdFormValue>('', { validators: [Validators.required] }),
  });

  constructor() {
    effect(() => {
      this.open();
      this.form.reset({ userId: '', role: '' });
    });
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.emit({
      userId: Number(this.form.controls.userId.value),
      role: `${this.form.controls.role.value ?? ''}` as FarmUserRole,
    });
  }

  protected cancel(): void {
    if (!this.submitting()) {
      this.cancelled.emit();
    }
  }

  protected userErrorMessage(): string | null {
    return this.form.controls.userId.hasError('required') ? 'Selecione um usuário.' : null;
  }

  protected roleErrorMessage(): string | null {
    return this.form.controls.role.hasError('required')
      ? 'Selecione o papel na fazenda.'
      : null;
  }

  private roleLabel(role: FarmUserRole): string {
    const labels: Record<string, string> = {
      PRODUCER: 'Produtor',
      EMPLOYEE: 'Funcionário',
      ACCOUNTANT: 'Contador',
    };

    return labels[role] ?? role;
  }
}
