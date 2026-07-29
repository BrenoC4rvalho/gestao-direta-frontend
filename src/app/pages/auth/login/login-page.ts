import { NgOptimizedImage } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { catchError, finalize, of, switchMap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { SystemStatusService } from '../../../core/services/system-status.service';
import { SessionStore } from '../../../core/stores/session.store';
import { ToastStore } from '../../../core/stores/toast.store';
import { GdFormControl, GdFormValue } from '../../../shared/forms';
import { Button } from '../../../shared/ui';

interface LoginForm {
  email: GdFormControl;
  password: GdFormControl;
  rememberMe: GdFormControl;
}

@Component({
  selector: 'gd-login-page',
  imports: [Button, LucideDynamicIcon, NgOptimizedImage, ReactiveFormsModule],
  templateUrl: './login-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly sessionStore = inject(SessionStore);
  private readonly systemStatusService = inject(SystemStatusService);
  private readonly toastStore = inject(ToastStore);

  protected readonly submitting = signal(false);
  protected readonly showPassword = signal(false);

  protected readonly form = new FormGroup<LoginForm>({
    email: new FormControl<GdFormValue>('', {
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl<GdFormValue>('', {
      validators: [Validators.required],
    }),
    rememberMe: new FormControl<GdFormValue>(false),
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const email = `${this.form.controls.email.value ?? ''}`;
    const password = `${this.form.controls.password.value ?? ''}`;

    const rememberMe = this.form.controls.rememberMe.value === true;

    this.submitting.set(true);

    this.systemStatusService
      .getStatus()
      .pipe(
        catchError(() => {
          void this.router.navigate(['/server-error']);
          return of(null);
        }),
        switchMap((status) => {
          if (!status) {
            return of(null);
          }

          if (!this.systemStatusService.isHealthy(status)) {
            void this.router.navigate(['/server-error']);
            return of(null);
          }

          return this.authService.login({ email, password, rememberMe });
        }),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (!response) {
            return;
          }

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

  protected showEmailError(): boolean {
    const control = this.form.controls.email;

    return control.invalid && (control.touched || control.dirty);
  }

  protected showPasswordError(): boolean {
    const control = this.form.controls.password;

    return control.invalid && (control.touched || control.dirty);
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

  protected passwordInputType(): 'password' | 'text' {
    return this.showPassword() ? 'text' : 'password';
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  private showLoginError(error: unknown): void {
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      this.toastStore.error('E-mail ou senha inválidos.');
      return;
    }

    this.toastStore.error('Não foi possível entrar. Tente novamente.');
  }
}
