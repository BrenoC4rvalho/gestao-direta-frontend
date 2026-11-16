import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import {
  GdFormControl,
  GdFormValue,
  Input,
  passwordPolicyValidator,
  PasswordRequirements,
} from '../../../shared/forms';
import { Button } from '../../../shared/ui';

@Component({
  selector: 'gd-reset-password-page',
  imports: [PasswordRequirements, ReactiveFormsModule, Input, Button],
  templateUrl: './reset-password-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly recoveryToken = `${history.state.recoveryToken ?? ''}`;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly form = new FormGroup<{
    password: GdFormControl;
    confirmPassword: GdFormControl;
  }>({
    password: new FormControl<GdFormValue>('', {
      validators: [
        Validators.required,
        passwordPolicyValidator,
      ],
    }),
    confirmPassword: new FormControl<GdFormValue>('', {
      validators: [Validators.required, this.confirmPasswordValidator()],
    }),
  });

  constructor() {
    this.form.controls.password.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.form.controls.confirmPassword.updateValueAndValidity({ onlySelf: true }));

    if (!this.recoveryToken) {
      void this.router.navigate(['/forgot-password']);
    }
  }

  protected confirmPasswordErrorMessage(): string | null {
    const control = this.form.controls.confirmPassword;
    if (control.hasError('required')) return 'Confirme a nova senha.';
    return control.hasError('passwordMismatch') ? 'As senhas não coincidem.' : null;
  }

  private confirmPasswordValidator(): (control: AbstractControl<GdFormValue>) => ValidationErrors | null {
    return (control) => {
      const confirmation = `${control.value ?? ''}`;
      const password = `${this.form?.controls.password.value ?? ''}`;
      return confirmation && password && confirmation !== password ? { passwordMismatch: true } : null;
    };
  }

  protected submit(): void {
    if (this.form.controls.password.value !== this.form.controls.confirmPassword.value) {
      this.form.controls.confirmPassword.setErrors({
        ...this.form.controls.confirmPassword.errors,
        passwordMismatch: true,
      });
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.authService
      .resetPassword(
        this.recoveryToken,
        `${this.form.controls.password.value ?? ''}`,
        `${this.form.controls.confirmPassword.value ?? ''}`,
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/login']),
        error: (error: unknown) => {
          const message = error instanceof HttpErrorResponse ? error.error?.message : null;
          this.errorMessage.set(
            message === 'Token de redefinição inválido ou expirado.'
              ? 'A sessão de recuperação expirou. Solicite um novo código.'
              : 'Não foi possível redefinir a senha. Tente novamente.',
          );
        },
      });
  }
}
