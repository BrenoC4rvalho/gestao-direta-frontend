import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { GdFormControl, GdFormValue, Input } from '../../../shared/forms';
import { Button } from '../../../shared/ui';

@Component({
  selector: 'gd-forgot-password-page',
  imports: [ReactiveFormsModule, Input, Button, RouterLink],
  templateUrl: './forgot-password-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly telegramAvailable = signal<boolean | null>(null);
  protected readonly requestFailed = signal(false);
  protected readonly form = new FormGroup<{ email: GdFormControl }>({
    email: new FormControl<GdFormValue>('', {
      validators: [Validators.required, Validators.email],
    }),
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.requestFailed.set(false);
    this.authService
      .passwordRecoveryOptions(this.email())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.telegramAvailable.set(response.telegramAvailable),
        error: () => this.requestFailed.set(true),
      });
  }

  protected requestTelegramCode(): void {
    this.loading.set(true);
    this.requestFailed.set(false);
    this.authService
      .requestTelegramPasswordRecovery(this.email())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () =>
          void this.router.navigate(['/forgot-password/verify'], {
            state: { email: this.email() },
          }),
        error: () => this.requestFailed.set(true),
      });
  }

  protected startOver(): void {
    this.telegramAvailable.set(null);
    this.requestFailed.set(false);
  }

  private email(): string {
    return `${this.form.controls.email.value ?? ''}`.trim();
  }
}
