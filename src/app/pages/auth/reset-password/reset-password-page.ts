import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { GdFormControl, GdFormValue, Input } from '../../../shared/forms';
import { Button } from '../../../shared/ui';

@Component({
  selector: 'gd-reset-password-page',
  imports: [ReactiveFormsModule, Input, Button],
  templateUrl: './reset-password-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
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
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/),
      ],
    }),
    confirmPassword: new FormControl<GdFormValue>('', { validators: [Validators.required] }),
  });

  constructor() {
    if (!this.recoveryToken) {
      void this.router.navigate(['/forgot-password']);
    }
  }

  protected submit(): void {
    if (
      this.form.invalid ||
      this.form.controls.password.value !== this.form.controls.confirmPassword.value
    ) {
      this.form.markAllAsTouched();
      this.errorMessage.set('As senhas devem ser iguais e atender aos requisitos.');
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
