import { ChangeDetectionStrategy, Component, computed, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  FarmUser,
  FarmUserRole,
  UpdateFarmUserRoleRequest,
} from '../../../../core/models/farm-user.models';
import {
  GdFormControl,
  GdFormValue,
  GdSelectOption,
  Select,
} from '../../../../shared/forms';
import { Button } from '../../../../shared/ui';

interface FarmUserRoleFormControls {
  role: GdFormControl;
}

@Component({
  selector: 'gd-farm-user-role-form',
  imports: [Button, ReactiveFormsModule, Select],
  templateUrl: './farm-user-role-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmUserRoleForm {
  readonly open = input(false);
  readonly farmUser = input<FarmUser | null>(null);
  readonly roles = input.required<readonly FarmUserRole[]>();
  readonly submitting = input(false);

  readonly submitted = output<UpdateFarmUserRoleRequest>();
  readonly cancelled = output<void>();

  protected readonly roleOptions = computed<readonly GdSelectOption[]>(() =>
    this.roles()
      .filter((role) => role !== this.farmUser()?.role)
      .map((role) => ({ label: this.roleLabel(role), value: role })),
  );

  protected readonly form = new FormGroup<FarmUserRoleFormControls>({
    role: new FormControl<GdFormValue>('', { validators: [Validators.required] }),
  });

  constructor() {
    effect(() => {
      this.open();
      this.farmUser();
      this.form.reset({ role: '' });
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
      role: `${this.form.controls.role.value ?? ''}` as FarmUserRole,
    });
  }

  protected cancel(): void {
    if (!this.submitting()) {
      this.cancelled.emit();
    }
  }

  protected roleErrorMessage(): string | null {
    return this.form.controls.role.hasError('required') ? 'Selecione o novo papel.' : null;
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
