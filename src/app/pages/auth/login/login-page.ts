import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { SessionStore } from '../../../core/stores/session.store';
import { ToastStore } from '../../../core/stores/toast.store';
import { GdFormControl, GdFormValue, Input } from '../../../shared/forms';
import { Button, Card } from '../../../shared/ui';

interface LoginForm {
  email: GdFormControl;
  password: GdFormControl;
}

@Component({
  selector: 'gd-login-page',
  imports: [Button, Card, Input, ReactiveFormsModule],
  templateUrl: './login-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly sessionStore = inject(SessionStore);
  private readonly toastStore = inject(ToastStore);

  protected readonly submitting = signal(false);

  protected readonly form = new FormGroup<LoginForm>({
    email: new FormControl<GdFormValue>('', {
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl<GdFormValue>('', {
      validators: [Validators.required],
    }),
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const email = `${this.form.controls.email.value ?? ''}`;
    const password = `${this.form.controls.password.value ?? ''}`;

    this.submitting.set(true);

    this.authService
      .login({ email, password })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response) => {
          this.sessionStore.setUser(response.user);
          this.sessionStore.setInitialized(true);
          void this.router.navigate(['/dashboard']);
        },
        error: (error: unknown) => {
          this.form.controls.password.setValue('');
          this.showLoginError(error);
        },
      });
  }

  protected emailErrorMessage(): string | null {
    const control = this.form.controls.email;

    if (control.hasError('required')) {
      return 'Informe seu e-mail.';
    }

    if (control.hasError('email')) {
      return 'Informe um e-mail válido.';
    }

    return null;
  }

  protected passwordErrorMessage(): string | null {
    return this.form.controls.password.hasError('required') ? 'Informe sua senha.' : null;
  }

  private showLoginError(error: unknown): void {
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      this.toastStore.error('E-mail ou senha inválidos.');
      return;
    }

    this.toastStore.error('Não foi possível entrar. Tente novamente.');
  }
}
