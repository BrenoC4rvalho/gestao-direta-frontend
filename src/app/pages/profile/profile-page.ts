import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';

import { UserStatus, UserType } from '../../core/models/auth.models';
import { User } from '../../core/models/user.models';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { GdFormControl, GdFormValue, Input } from '../../shared/forms';
import { Badge, BadgeVariant, Button, Card, ErrorState, Skeleton } from '../../shared/ui';

interface ProfileFormControls {
  name: GdFormControl;
  email: GdFormControl;
  document: GdFormControl;
}

interface PasswordFormControls {
  currentPassword: GdFormControl;
  newPassword: GdFormControl;
  confirmPassword: GdFormControl;
}

@Component({
  selector: 'gd-profile-page',
  imports: [Badge, Button, Card, ErrorState, Input, ReactiveFormsModule, Skeleton],
  templateUrl: './profile-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage implements OnInit {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly sessionStore = inject(SessionStore);
  private readonly toastStore = inject(ToastStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly user = signal<User | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly savingProfile = signal(false);
  protected readonly changingPassword = signal(false);
  protected readonly skeletons = [1, 2, 3];

  protected readonly profileForm = new FormGroup<ProfileFormControls>({
    name: new FormControl<GdFormValue>('', {
      validators: [Validators.required],
    }),
    email: new FormControl<GdFormValue>(''),
    document: new FormControl<GdFormValue>(''),
  });

  protected readonly passwordForm = new FormGroup<PasswordFormControls>({
    currentPassword: new FormControl<GdFormValue>('', {
      validators: [Validators.required],
    }),
    newPassword: new FormControl<GdFormValue>('', {
      validators: [Validators.required, Validators.minLength(8)],
    }),
    confirmPassword: new FormControl<GdFormValue>('', {
      validators: [Validators.required, this.confirmPasswordValidator()],
    }),
  });

  constructor() {
    this.passwordForm.controls.newPassword.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.passwordForm.controls.confirmPassword.updateValueAndValidity({
          onlySelf: true,
        });
      });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  protected loadProfile(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    this.userService
      .getMe()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => {
          this.user.set(user);
          this.populateProfileForm(user);
        },
        error: (error: unknown) => this.handleLoadError(error),
      });
  }

  protected saveProfile(): void {
    if (this.savingProfile()) {
      return;
    }

    const name = this.stringValue(this.profileForm.controls.name.value);
    this.setRequiredErrorIfEmpty(this.profileForm.controls.name, name);

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.savingProfile.set(true);

    this.userService
      .updateMe({
        name,
        document: this.nullableString(this.profileForm.controls.document.value),
      })
      .pipe(
        finalize(() => this.savingProfile.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updatedUser) => {
          this.user.set(updatedUser);
          this.sessionStore.setUser(updatedUser);
          this.populateProfileForm(updatedUser);
          this.toastStore.success('Perfil atualizado com sucesso.');
        },
        error: (error: unknown) => this.handleSaveProfileError(error),
      });
  }

  protected changePassword(): void {
    if (this.changingPassword()) {
      return;
    }

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.changingPassword.set(true);

    this.authService
      .changePassword({
        currentPassword: this.stringValue(this.passwordForm.controls.currentPassword.value),
        newPassword: this.stringValue(this.passwordForm.controls.newPassword.value),
      })
      .pipe(
        finalize(() => this.changingPassword.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.passwordForm.reset({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          });
          this.toastStore.success('Senha alterada com sucesso.');
        },
        error: (error: unknown) => this.handleChangePasswordError(error),
      });
  }

  protected userTypeLabel(type: UserType | null | undefined): string {
    const labels: Record<string, string> = {
      ADMIN: 'Administrador',
      USER: 'Usuário',
    };

    return type ? labels[type] ?? type : 'Não informado';
  }

  protected userTypeVariant(type: UserType | null | undefined): BadgeVariant {
    return type === 'ADMIN' ? 'info' : 'neutral';
  }

  protected statusLabel(status: UserStatus | null | undefined): string {
    const labels: Record<string, string> = {
      ACTIVE: 'Ativo',
      INACTIVE: 'Inativo',
      BLOCKED: 'Bloqueado',
    };

    return status ? labels[status] ?? status : 'Não informado';
  }

  protected statusVariant(status: UserStatus | null | undefined): BadgeVariant {
    const variants: Record<string, BadgeVariant> = {
      ACTIVE: 'success',
      INACTIVE: 'neutral',
      BLOCKED: 'danger',
    };

    return status ? variants[status] ?? 'info' : 'neutral';
  }

  protected nameErrorMessage(): string | null {
    return this.profileForm.controls.name.hasError('required') ? 'Informe seu nome.' : null;
  }

  protected currentPasswordErrorMessage(): string | null {
    return this.passwordForm.controls.currentPassword.hasError('required')
      ? 'Informe sua senha atual.'
      : null;
  }

  protected newPasswordErrorMessage(): string | null {
    const control = this.passwordForm.controls.newPassword;

    if (control.hasError('required')) {
      return 'Informe a nova senha.';
    }

    return control.hasError('minlength') ? 'A nova senha deve ter pelo menos 8 caracteres.' : null;
  }

  protected confirmPasswordErrorMessage(): string | null {
    const control = this.passwordForm.controls.confirmPassword;

    if (control.hasError('required')) {
      return 'Confirme a nova senha.';
    }

    return control.hasError('passwordMismatch') ? 'As senhas não conferem.' : null;
  }

  private populateProfileForm(user: User): void {
    this.profileForm.reset({
      name: user.name,
      email: user.email,
      document: user.document ?? '',
    });
  }

  private handleLoadError(error: unknown): void {
    this.error.set(true);

    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.toastStore.error('Sua sessão expirou. Faça login novamente.');
      return;
    }

    this.toastStore.error('Não foi possível carregar seu perfil.');
  }

  private handleSaveProfileError(error: unknown): void {
    const messages: Record<number, string> = {
      400: 'Verifique os dados informados.',
      401: 'Sua sessão expirou. Faça login novamente.',
      403: 'Você não tem permissão para alterar estes dados.',
    };

    this.toastStore.error(this.errorMessage(error, messages, 'Não foi possível atualizar o perfil.'));
  }

  private handleChangePasswordError(error: unknown): void {
    const messages: Record<number, string> = {
      400: 'Verifique a senha atual e a nova senha.',
      401: 'Sua sessão expirou. Faça login novamente.',
      403: 'Você não tem permissão para alterar a senha.',
    };

    this.toastStore.error(this.errorMessage(error, messages, 'Não foi possível alterar a senha.'));
  }

  private errorMessage(
    error: unknown,
    messages: Record<number, string>,
    fallback: string,
  ): string {
    if (error instanceof HttpErrorResponse) {
      return messages[error.status] ?? fallback;
    }

    return fallback;
  }

  private confirmPasswordValidator(): (control: AbstractControl<GdFormValue>) => ValidationErrors | null {
    return (control: AbstractControl<GdFormValue>): ValidationErrors | null => {
      const confirmation = this.stringValue(control.value);
      const password = this.stringValue(this.passwordForm?.controls.newPassword.value);

      return confirmation && password && confirmation !== password ? { passwordMismatch: true } : null;
    };
  }

  private setRequiredErrorIfEmpty(control: GdFormControl, value: string): void {
    if (!value) {
      control.setErrors({ ...control.errors, required: true });
    }
  }

  private stringValue(value: GdFormValue): string {
    return `${value ?? ''}`.trim();
  }

  private nullableString(value: GdFormValue): string | null {
    return this.stringValue(value) || null;
  }
}
