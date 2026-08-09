import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { GdFormControl, GdFormValue, Input } from '../../../shared/forms';
import { Button } from '../../../shared/ui';

@Component({
  selector: 'gd-verify-recovery-code-page',
  imports: [ReactiveFormsModule, Input, Button, RouterLink],
  templateUrl: './verify-recovery-code-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyRecoveryCodePage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly email = `${history.state.email ?? ''}`.trim();

  protected readonly phoneLastFour = signal(`${history.state.phoneLastFour ?? ''}`.trim());
  protected readonly loading = signal(false);
  protected readonly resending = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly form = new FormGroup<{ code: GdFormControl }>({
    code: new FormControl<GdFormValue>('', {
      validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
    }),
  });

  constructor() {
    if (!this.email || !this.phoneLastFour()) {
      void this.router.navigate(['/forgot-password']);
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.authService
      .verifyPasswordRecoveryCode(this.email, `${this.form.controls.code.value ?? ''}`)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          void this.router.navigate(['/forgot-password/reset'], {
            state: { recoveryToken: response.recoveryToken },
          });
        },
        error: (error: unknown) => this.errorMessage.set(this.toErrorMessage(error)),
      });
  }

  protected resend(): void {
    this.resending.set(true);
    this.errorMessage.set(null);
    this.authService
      .requestTelegramPasswordRecovery(this.email)
      .pipe(finalize(() => this.resending.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.phoneLastFour) {
            this.errorMessage.set('Não foi possível enviar outro código. Tente novamente.');
            return;
          }

          this.phoneLastFour.set(response.phoneLastFour);
          this.form.reset();
        },
        error: () =>
          this.errorMessage.set('Não foi possível enviar outro código. Tente novamente.'),
      });
  }

  private toErrorMessage(error: unknown): string {
    const message = error instanceof HttpErrorResponse ? error.error?.message : null;

    if (message === 'Código expirado.') {
      return 'Este código expirou. Solicite outro código.';
    }
    if (message === 'Código bloqueado.') {
      return 'Este código foi bloqueado. Solicite outro código.';
    }
    if (message === 'Código inválido.') {
      return 'Código inválido. Confira e tente novamente.';
    }
    return 'Não foi possível validar o código. Tente novamente.';
  }
}
