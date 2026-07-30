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
  protected readonly requested = signal(false);
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
    const email = `${this.form.controls.email.value ?? ''}`.trim();
    this.authService
      .requestPasswordRecovery(email)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.requested.set(true),
        error: () => this.requestFailed.set(true),
      });
  }

  protected continue(): void {
    void this.router.navigate(['/verify-recovery-code'], {
      state: { email: this.form.controls.email.value },
    });
  }
}
