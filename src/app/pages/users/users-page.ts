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
import { CreateUserRequest, UpdateUserRequest, User, UserListParams } from '../../core/models/user.models';
import { UserService } from '../../core/services/user.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { ConfirmDialog, ConfirmDialogVariant, Drawer } from '../../shared/overlays';
import { DocumentFormatPipe } from '../../shared/pipes/document-format.pipe';
import { Badge, BadgeVariant, Button, EmptyState, ErrorState, ListFilters, ListFiltersConfig, Skeleton } from '../../shared/ui';
import { UserEditForm } from './components/user-edit-form/user-edit-form';
import { UserForm } from './components/user-form/user-form';

type UserEditAction =
  | {
      kind: 'status';
      user: User;
      nextStatus: UserStatus;
    }
  | {
      kind: 'type';
      user: User;
      nextType: UserType;
    }
  | {
      kind: 'resetPassword';
      user: User;
      newPassword: string;
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
    DocumentFormatPipe,
    EmptyState,
    ErrorState,
    ListFilters,
    Skeleton,
    UserEditForm,
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
  protected readonly farmAccessStore = inject(FarmAccessStore);
  protected readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly response = signal<PageResponse<User> | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly accessDenied = signal(false);
  protected readonly drawerOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly editingUser = signal<User | null>(null);
  protected readonly profileSubmitting = signal(false);
  protected readonly typeSubmitting = signal(false);
  protected readonly statusSubmitting = signal(false);
  protected readonly resetSubmitting = signal(false);
  protected readonly pendingEditAction = signal<UserEditAction | null>(null);
  protected readonly skeletons = [1, 2, 3, 4, 5];
  protected readonly filters = signal<Pick<UserListParams, 'search' | 'userType' | 'status'>>({
    search: null,
    userType: null,
    status: null,
  });
  protected readonly filtersConfig: ListFiltersConfig = {
    search: { placeholder: 'Buscar por nome ou e-mail' },
    selects: [
      {
        key: 'userType',
        label: 'Tipo',
        options: [
          { label: 'Todos', value: null },
          { label: 'Administrador', value: 'ADMIN' },
          { label: 'Usuário', value: 'USER' },
        ],
      },
      {
        key: 'status',
        label: 'Status',
        options: [
          { label: 'Todos', value: null },
          { label: 'Ativo', value: 'ACTIVE' },
          { label: 'Inativo', value: 'INACTIVE' },
          { label: 'Bloqueado', value: 'BLOCKED' },
        ],
      },
    ],
  };

  protected readonly canListUsers = computed(() => this.sessionStore.isAdmin());
  protected readonly canCreateUsers = computed(() => {
    if (this.sessionStore.isAdmin()) {
      return true;
    }

    const farmId = this.selectedFarmStore.selectedFarmId();
    return (
      farmId !== null &&
      this.farmAccessStore.access()?.farmId === farmId &&
      this.farmAccessStore.canManageFarmUsers()
    );
  });
  protected readonly isProducerMode = computed(
    () => !this.sessionStore.isAdmin() && this.canCreateUsers(),
  );
  protected readonly allowedUserTypes = computed<readonly UserType[]>(() =>
    this.sessionStore.isAdmin() ? ['USER', 'ADMIN'] : ['USER'],
  );
  protected readonly waitingForFarmAccess = computed(
    () =>
      !this.sessionStore.isAdmin() &&
      this.selectedFarmStore.selectedFarmId() !== null &&
      (this.farmAccessStore.loading() ||
        (!this.farmAccessStore.access() && !this.farmAccessStore.error())),
  );

  protected readonly users = computed(() => this.response()?.content ?? []);
  protected readonly hasActiveFilters = computed(() =>
    Object.values(this.filters()).some((value) => value !== null),
  );
  protected readonly emptyUsersDescription = computed(() =>
    this.hasActiveFilters()
      ? "Nenhum resultado encontrado para os filtros informados."
      : "Quando houver usuários cadastrados, eles aparecerão aqui.",
  );
  protected readonly currentPage = computed(() => this.response()?.page ?? 0);
  protected readonly editDrawerOpen = computed(() => this.editingUser() !== null);
  protected readonly isEditingCurrentUser = computed(() => {
    const user = this.editingUser();
    return user !== null && this.isCurrentUser(user);
  });
  protected readonly editActionSubmitting = computed(
    () => this.typeSubmitting() || this.statusSubmitting() || this.resetSubmitting(),
  );
  protected readonly editBusy = computed(
    () => this.profileSubmitting() || this.editActionSubmitting(),
  );
  protected readonly actionConfirmation = computed<UserActionConfirmation>(() =>
    this.getActionConfirmation(this.pendingEditAction()),
  );
  private readonly userForm = viewChild(UserForm);
  private readonly userEditForm = viewChild(UserEditForm);

  private readonly dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
  });

  ngOnInit(): void {
    if (this.canListUsers()) {
      this.loadPage(0);
    }
  }

  protected retry(): void {
    this.loadPage(this.currentPage());
  }

  protected changeFilters(filters: Record<string, string | null>): void {
    this.filters.set({
      search: filters['search'],
      userType: filters['userType'] as UserListParams['userType'],
      status: filters['status'] as UserListParams['status'],
    });
    this.loadPage(0);
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
    if (this.canCreateUsers()) {
      this.drawerOpen.set(true);
    }
  }

  protected closeDrawer(): void {
    if (!this.submitting()) {
      this.drawerOpen.set(false);
    }
  }

  protected openEditDrawer(user: User): void {
    if (this.sessionStore.isAdmin()) {
      this.pendingEditAction.set(null);
      this.editingUser.set(user);
    }
  }

  protected closeEditDrawer(): void {
    if (!this.editBusy()) {
      this.pendingEditAction.set(null);
      this.editingUser.set(null);
    }
  }

  protected createUser(payload: CreateUserRequest): void {
    if (!this.canCreateUsers() || this.submitting()) {
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

          if (this.canListUsers()) {
            this.loadPage(this.currentPage());
          }
        },
        error: (error: unknown) => this.handleCreateError(error),
      });
  }

  protected saveProfile(payload: UpdateUserRequest): void {
    const user = this.editingUser();

    if (!user || !this.sessionStore.isAdmin() || this.profileSubmitting()) {
      return;
    }

    this.profileSubmitting.set(true);

    this.userService
      .update(user.id, payload)
      .pipe(
        finalize(() => this.profileSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updatedUser) => {
          this.updateEditedUser(updatedUser);
          this.toastStore.success('Dados do usuário atualizados.');
          this.loadPage(this.currentPage());
        },
        error: (error: unknown) => this.handleUpdateError(error),
      });
  }

  protected requestStatusChange(nextStatus: UserStatus): void {
    const user = this.editingUser();

    if (!user || this.editActionSubmitting() || !this.canManageUserAccess(user)) {
      return;
    }

    this.pendingEditAction.set({ kind: 'status', user, nextStatus });
  }

  protected requestTypeChange(nextType: UserType): void {
    const user = this.editingUser();

    if (!user || this.editActionSubmitting() || !this.canManageUserAccess(user)) {
      return;
    }

    this.pendingEditAction.set({ kind: 'type', user, nextType });
  }

  protected requestPasswordReset(password: string): void {
    const user = this.editingUser();

    if (!user || this.editActionSubmitting()) {
      return;
    }

    if (this.isCurrentUser(user)) {
      this.toastStore.error('Para alterar sua própria senha, acesse Minha conta.');
      this.userEditForm()?.clearPassword();
      return;
    }

    if (!this.sessionStore.isAdmin()) {
      this.toastStore.error('Você não tem permissão para realizar esta ação.');
      this.pendingEditAction.set(null);
      this.userEditForm()?.clearPassword();
      return;
    }

    this.pendingEditAction.set({ kind: 'resetPassword', user, newPassword: password });
  }

  protected closeActionConfirmation(): void {
    if (!this.editActionSubmitting()) {
      this.pendingEditAction.set(null);
    }
  }

  protected confirmAction(): void {
    const action = this.pendingEditAction();

    if (!action || this.editActionSubmitting()) {
      return;
    }

    if (action.kind === 'resetPassword') {
      this.confirmPasswordReset(action);
      return;
    }

    if (!this.canManageUserAccess(action.user)) {
      return;
    }

    if (action.kind === 'status') {
      this.confirmStatusChange(action);
      return;
    }

    this.confirmTypeChange(action);
  }

  protected isCurrentUser(user: User): boolean {
    return this.sessionStore.user()?.id === user.id;
  }

  private confirmStatusChange(action: Extract<UserEditAction, { kind: 'status' }>): void {
    this.statusSubmitting.set(true);

    this.userService
      .updateStatus(action.user.id, { status: action.nextStatus })
      .pipe(
        finalize(() => this.statusSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updatedUser) => {
          this.pendingEditAction.set(null);
          this.updateEditedUser(updatedUser);
          this.toastStore.success('Status do usuário atualizado.');
          this.loadPage(this.currentPage());
        },
        error: (error: unknown) => this.handleStatusError(error),
      });
  }

  private confirmTypeChange(action: Extract<UserEditAction, { kind: 'type' }>): void {
    this.typeSubmitting.set(true);

    this.userService
      .updateType(action.user.id, { userType: action.nextType })
      .pipe(
        finalize(() => this.typeSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updatedUser) => {
          this.pendingEditAction.set(null);
          this.updateEditedUser(updatedUser);
          this.toastStore.success('Tipo do usuário atualizado.');
          this.loadPage(this.currentPage());
        },
        error: (error: unknown) => this.handleTypeError(error),
      });
  }

  private confirmPasswordReset(action: Extract<UserEditAction, { kind: 'resetPassword' }>): void {
    if (this.isCurrentUser(action.user)) {
      this.toastStore.error('Para alterar sua própria senha, acesse Minha conta.');
      this.pendingEditAction.set(null);
      this.userEditForm()?.clearPassword();
      return;
    }

    if (!this.sessionStore.isAdmin()) {
      this.toastStore.error('Você não tem permissão para realizar esta ação.');
      this.pendingEditAction.set(null);
      this.userEditForm()?.clearPassword();
      return;
    }

    this.resetSubmitting.set(true);

    this.userService
      .resetPassword(action.user.id, { newPassword: action.newPassword })
      .pipe(
        finalize(() => this.resetSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updatedUser) => {
          this.pendingEditAction.set(null);
          this.updateEditedUser(updatedUser);
          this.userEditForm()?.clearPassword();
          this.toastStore.success('Senha do usuário resetada.');
        },
        error: (error: unknown) => this.handleResetPasswordError(error, action.user),
      });
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
      403: 'Você não tem permissão para criar este tipo de usuário.',
      409: 'Já existe um usuário com os dados informados.',
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

  private canManageUserAccess(user: User): boolean {
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

  private getActionConfirmation(action: UserEditAction | null): UserActionConfirmation {
    if (!action) {
      return {
        title: 'Alterar usuário',
        description: 'Confirme a alteração deste usuário.',
        confirmLabel: 'Confirmar',
        variant: 'info',
      };
    }

    if (action.kind === 'resetPassword') {
      return {
        title: 'Resetar senha',
        description: `A senha de ${action.user.name} será redefinida para a senha temporária informada.`,
        confirmLabel: 'Resetar senha',
        variant: 'warning',
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

    return (
      confirmations[action.nextStatus] ?? {
        title: 'Alterar status',
        description: `Confirme a alteração de status de ${action.user.name}.`,
        confirmLabel: 'Confirmar',
        variant: 'warning',
      }
    );
  }

  private loadPage(page: number): void {
    if (!this.canListUsers() || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(false);
    this.accessDenied.set(false);

    this.userService
      .list({ page, size: 10, sort: 'name', direction: 'ASC', ...this.activeFilters() })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.response.set(response),
        error: (error: unknown) => this.handleLoadError(error),
      });
  }

  private activeFilters(): Pick<UserListParams, 'search' | 'userType' | 'status'> {
    const filters = this.filters();

    return {
      ...(filters.search !== null ? { search: filters.search } : {}),
      ...(filters.userType !== null ? { userType: filters.userType } : {}),
      ...(filters.status !== null ? { status: filters.status } : {}),
    };
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

  private handleUpdateError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.toastStore.error('Não foi possível atualizar os dados do usuário.');
      return;
    }

    const messages: Record<number, string> = {
      400: 'Verifique os dados informados.',
      401: 'Sua sessão expirou. Faça login novamente.',
      403: 'Você não tem permissão para editar este usuário.',
      404: 'Usuário não encontrado.',
    };

    this.toastStore.error(
      messages[error.status] ?? 'Não foi possível atualizar os dados do usuário.',
    );
  }

  private handleStatusError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.toastStore.error('Não foi possível atualizar o status do usuário.');
      return;
    }

    const messages: Record<number, string> = {
      400: 'Verifique os dados informados.',
      401: 'Sua sessão expirou. Faça login novamente.',
      403: 'Você não tem permissão para alterar o status deste usuário.',
      404: 'Usuário não encontrado.',
    };

    this.toastStore.error(
      messages[error.status] ?? 'Não foi possível atualizar o status do usuário.',
    );
  }

  private handleTypeError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.toastStore.error('Não foi possível atualizar o tipo do usuário.');
      return;
    }

    const messages: Record<number, string> = {
      400: 'Verifique os dados informados.',
      401: 'Sua sessão expirou. Faça login novamente.',
      403: 'Você não tem permissão para alterar o tipo deste usuário.',
      404: 'Usuário não encontrado.',
    };

    this.toastStore.error(
      messages[error.status] ?? 'Não foi possível atualizar o tipo do usuário.',
    );
  }

  private handleResetPasswordError(error: unknown, user: User): void {
    this.userEditForm()?.clearPassword();

    if (!(error instanceof HttpErrorResponse)) {
      this.toastStore.error('Não foi possível resetar a senha do usuário.');
      return;
    }

    if (error.status === 400 && this.isCurrentUser(user)) {
      this.toastStore.error('Para alterar sua própria senha, acesse Minha conta.');
      return;
    }

    const messages: Record<number, string> = {
      400: 'Verifique a nova senha informada.',
      401: 'Sua sessão expirou. Faça login novamente.',
      403: 'Você não tem permissão para resetar senha.',
      404: 'Usuário não encontrado.',
    };

    this.toastStore.error(messages[error.status] ?? 'Não foi possível resetar a senha do usuário.');
  }

  private updateEditedUser(updatedUser: User): void {
    this.editingUser.set(updatedUser);
  }
}
