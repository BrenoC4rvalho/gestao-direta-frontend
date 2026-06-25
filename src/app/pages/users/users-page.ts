import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { UserStatus, UserType } from '../../core/models/auth.models';
import { PageResponse } from '../../core/models/page-response.model';
import { CreateUserRequest, User } from '../../core/models/user.models';
import { UserService } from '../../core/services/user.service';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { ConfirmDialog, ConfirmDialogVariant, Drawer } from '../../shared/overlays';
import { Badge, BadgeVariant, Button, EmptyState, ErrorState, Skeleton } from '../../shared/ui';
import { UserForm } from './components/user-form/user-form';

type UserAction =
  | {
      kind: 'status';
      user: User;
      nextStatus: UserStatus;
    }
  | {
      kind: 'type';
      user: User;
      nextType: UserType;
    };

interface UserActionConfirmation {
  title: string;
  description: string;
  confirmLabel: string;
  variant: ConfirmDialogVariant;
}

@Component({
  selector: 'gd-users-page',
  imports: [
    Badge,
    Button,
    ConfirmDialog,
    Drawer,
    EmptyState,
    ErrorState,
    Skeleton,
    UserForm,
  ],
  templateUrl: './users-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPage implements OnInit {
  private readonly userService = inject(UserService);
  private readonly toastStore = inject(ToastStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly sessionStore = inject(SessionStore);
  protected readonly response = signal<PageResponse<User> | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly accessDenied = signal(false);
  protected readonly drawerOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly pendingAction = signal<UserAction | null>(null);
  protected readonly actionSubmitting = signal(false);
  protected readonly skeletons = [1, 2, 3, 4, 5];

  protected readonly users = computed(() => this.response()?.content ?? []);
  protected readonly currentPage = computed(() => this.response()?.page ?? 0);
  protected readonly actionConfirmation = computed<UserActionConfirmation>(() =>
    this.getActionConfirmation(this.pendingAction()),
  );
  private readonly userForm = viewChild(UserForm);

  private readonly dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
  });

  ngOnInit(): void {
    if (!this.sessionStore.isAdmin()) {
      this.accessDenied.set(true);
      return;
    }

    this.loadPage(0);
  }

  protected retry(): void {
    this.loadPage(this.currentPage());
  }

  protected previousPage(): void {
    const response = this.response();

    if (response && !response.first) {
      this.loadPage(response.page - 1);
    }
  }

  protected nextPage(): void {
    const response = this.response();

    if (response && !response.last) {
      this.loadPage(response.page + 1);
    }
  }

  protected openCreateDrawer(): void {
    if (this.sessionStore.isAdmin()) {
      this.drawerOpen.set(true);
    }
  }

  protected closeDrawer(): void {
    if (!this.submitting()) {
      this.drawerOpen.set(false);
    }
  }

  protected createUser(payload: CreateUserRequest): void {
    if (!this.sessionStore.isAdmin() || this.submitting()) {
      return;
    }

    this.submitting.set(true);

    this.userService
      .create(payload)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.drawerOpen.set(false);
          this.toastStore.success('Usuário criado com sucesso.');
          this.loadPage(this.currentPage());
        },
        error: (error: unknown) => this.handleCreateError(error),
      });
  }

  protected requestStatusChange(user: User, nextStatus: UserStatus): void {
    if (!this.actionSubmitting() && this.canManageUser(user)) {
      this.pendingAction.set({ kind: 'status', user, nextStatus });
    }
  }

  protected requestTypeChange(user: User): void {
    if (!this.actionSubmitting() && this.canManageUser(user)) {
      this.pendingAction.set({
        kind: 'type',
        user,
        nextType: user.userType === 'ADMIN' ? 'USER' : 'ADMIN',
      });
    }
  }

  protected closeActionConfirmation(): void {
    if (!this.actionSubmitting()) {
      this.pendingAction.set(null);
    }
  }

  protected confirmAction(): void {
    const action = this.pendingAction();

    if (!action || this.actionSubmitting() || !this.canManageUser(action.user)) {
      return;
    }

    this.actionSubmitting.set(true);

    const request$ =
      action.kind === 'status'
        ? this.userService.updateStatus(action.user.id, { status: action.nextStatus })
        : this.userService.updateType(action.user.id, { userType: action.nextType });

    request$
      .pipe(
        finalize(() => this.actionSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.pendingAction.set(null);
          this.toastStore.success(
            action.kind === 'status'
              ? 'Status do usuário atualizado.'
              : 'Tipo do usuário atualizado.',
          );
          this.loadPage(this.currentPage());
        },
        error: (error: unknown) => this.handleActionError(error),
      });
  }

  protected isCurrentUser(user: User): boolean {
    return this.sessionStore.user()?.id === user.id;
  }

  private handleCreateError(error: unknown): void {
    this.userForm()?.clearPassword();

    if (!(error instanceof HttpErrorResponse)) {
      this.toastStore.error('Não foi possível criar o usuário.');
      return;
    }

    const messages: Record<number, string> = {
      400: 'Verifique os dados informados.',
      401: 'Sua sessão expirou. Faça login novamente.',
      403: 'Você não tem permissão para criar usuários.',
    };

    this.toastStore.error(messages[error.status] ?? 'Não foi possível criar o usuário.');
  }

  protected userTypeLabel(user: User): string {
    const labels: Record<string, string> = {
      ADMIN: 'Administrador',
      USER: 'Usuário',
    };

    return labels[user.userType] ?? user.userType;
  }

  protected userTypeVariant(user: User): BadgeVariant {
    return user.userType === 'ADMIN' ? 'info' : 'neutral';
  }

  protected statusLabel(user: User): string {
    const labels: Record<string, string> = {
      ACTIVE: 'Ativo',
      INACTIVE: 'Inativo',
      BLOCKED: 'Bloqueado',
    };

    return labels[user.status] ?? user.status;
  }

  protected statusVariant(user: User): BadgeVariant {
    const variants: Record<string, BadgeVariant> = {
      ACTIVE: 'success',
      INACTIVE: 'neutral',
      BLOCKED: 'danger',
    };

    return variants[user.status] ?? 'info';
  }

  protected createdAtLabel(user: User): string {
    const date = new Date(user.createdAt);
    return Number.isNaN(date.getTime()) ? 'Data não informada' : this.dateFormatter.format(date);
  }

  private canManageUser(user: User): boolean {
    if (this.isCurrentUser(user)) {
      this.toastStore.error('Você não pode alterar seu próprio acesso.');
      return false;
    }

    if (!this.sessionStore.isAdmin()) {
      this.toastStore.error('Você não tem permissão para realizar esta ação.');
      return false;
    }

    return true;
  }

  private getActionConfirmation(action: UserAction | null): UserActionConfirmation {
    if (!action) {
      return {
        title: 'Alterar usuário',
        description: 'Confirme a alteração de acesso deste usuário.',
        confirmLabel: 'Confirmar',
        variant: 'info',
      };
    }

    if (action.kind === 'type') {
      return action.nextType === 'ADMIN'
        ? {
            title: 'Tornar administrador',
            description: `${action.user.name} terá acesso administrativo ao sistema.`,
            confirmLabel: 'Tornar administrador',
            variant: 'info',
          }
        : {
            title: 'Tornar usuário',
            description: `${action.user.name} perderá o acesso administrativo ao sistema.`,
            confirmLabel: 'Tornar usuário',
            variant: 'warning',
          };
    }

    const confirmations: Record<string, UserActionConfirmation> = {
      ACTIVE: {
        title: 'Ativar usuário',
        description: `${action.user.name} voltará a ter acesso ao sistema.`,
        confirmLabel: 'Ativar',
        variant: 'info',
      },
      BLOCKED: {
        title: 'Bloquear usuário',
        description: `${action.user.name} terá o acesso temporariamente bloqueado.`,
        confirmLabel: 'Bloquear',
        variant: 'danger',
      },
      INACTIVE: {
        title: 'Inativar usuário',
        description: `${action.user.name} deixará de ter acesso ao sistema.`,
        confirmLabel: 'Inativar',
        variant: 'warning',
      },
    };

    return confirmations[action.nextStatus] ?? {
      title: 'Alterar status',
      description: `Confirme a alteração de status de ${action.user.name}.`,
      confirmLabel: 'Confirmar',
      variant: 'warning',
    };
  }

  private loadPage(page: number): void {
    if (!this.sessionStore.isAdmin() || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(false);
    this.accessDenied.set(false);

    this.userService
      .list({ page, size: 10, sort: 'name', direction: 'ASC' })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.response.set(response),
        error: (error: unknown) => this.handleLoadError(error),
      });
  }

  private handleLoadError(error: unknown): void {
    this.response.set(null);

    if (error instanceof HttpErrorResponse && error.status === 403) {
      this.accessDenied.set(true);
      this.toastStore.warning('Você não tem permissão para visualizar usuários.');
      return;
    }

    this.error.set(true);
  }

  private handleActionError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.toastStore.error('Não foi possível concluir a operação.');
      return;
    }

    const messages: Record<number, string> = {
      400: 'Verifique os dados informados.',
      401: 'Sua sessão expirou. Faça login novamente.',
      403: 'Você não tem permissão para realizar esta ação.',
      404: 'Usuário não encontrado.',
    };

    this.toastStore.error(messages[error.status] ?? 'Não foi possível concluir a operação.');
  }
}
