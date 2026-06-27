import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subscription } from 'rxjs';

import {
  CreateFarmUserRequest,
  FarmUser,
  FarmUserRole,
  UpdateFarmUserRoleRequest,
} from '../../core/models/farm-user.models';
import { User } from '../../core/models/user.models';
import { FarmUserService } from '../../core/services/farm-user.service';
import { UserService } from '../../core/services/user.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { ConfirmDialog, Drawer } from '../../shared/overlays';
import {
  Badge,
  BadgeVariant,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
} from '../../shared/ui';
import { FarmUserForm } from './components/farm-user-form/farm-user-form';
import { FarmUserRoleForm } from './components/farm-user-role-form/farm-user-role-form';

@Component({
  selector: 'gd-farm-users-page',
  host: {
    '(document:keydown.escape)': 'closeEditDrawer()',
  },
  imports: [
    Badge,
    Button,
    Card,
    ConfirmDialog,
    Drawer,
    EmptyState,
    ErrorState,
    FarmUserForm,
    FarmUserRoleForm,
    Skeleton,
  ],
  templateUrl: './farm-users-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmUsersPage {
  private readonly farmUserService = inject(FarmUserService);
  private readonly userService = inject(UserService);
  private readonly toastStore = inject(ToastStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly farmAccessStore = inject(FarmAccessStore);
  protected readonly sessionStore = inject(SessionStore);

  protected readonly farmUsers = signal<FarmUser[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly accessDenied = signal(false);
  protected readonly linkDrawerOpen = signal(false);
  protected readonly linkSubmitting = signal(false);
  protected readonly availableUsers = signal<User[]>([]);
  protected readonly availableUsersLoading = signal(false);
  protected readonly availableUsersError = signal(false);
  protected readonly foundUser = signal<User | null>(null);
  protected readonly userSearchLoading = signal(false);
  protected readonly userSearchError = signal<string | null>(null);
  protected readonly editTarget = signal<FarmUser | null>(null);
  protected readonly roleSubmitting = signal(false);
  protected readonly inactivationTarget = signal<FarmUser | null>(null);
  protected readonly inactivationSubmitting = signal(false);
  protected readonly skeletons = [1, 2, 3, 4, 5];

  private readonly reloadTrigger = signal(0);
  private previousFarmId: number | null = null;
  private availableUsersSubscription: Subscription | null = null;

  protected readonly allowedRoles = computed<readonly FarmUserRole[]>(() =>
    this.sessionStore.isAdmin()
      ? ['PRODUCER', 'EMPLOYEE', 'ACCOUNTANT']
      : ['EMPLOYEE', 'ACCOUNTANT'],
  );
  protected readonly roleDrawerOptions = computed<readonly FarmUserRole[]>(() =>
    this.allowedRoles().filter((role) => role !== this.editTarget()?.role),
  );
  protected readonly linkFormMode = computed(() =>
    this.sessionStore.isAdmin() ? 'admin-list' : 'email-search',
  );
  private readonly dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
  });

  constructor() {
    effect((onCleanup) => {
      const farmId = this.selectedFarmStore.selectedFarmId();
      this.reloadTrigger();

      if (this.previousFarmId !== farmId) {
        this.previousFarmId = farmId;
        this.resetTransientState();
      }

      if (!farmId) {
        this.clearListState();
        return;
      }

      if (!this.sessionStore.isAdmin()) {
        const access = this.farmAccessStore.access();
        const accessLoading = this.farmAccessStore.loading();

        if (accessLoading || (!access && !this.farmAccessStore.error())) {
          this.clearListState();
          return;
        }

        if (access?.farmId !== farmId || !access.permissions.canManageFarmUsers) {
          this.clearListState();
          this.accessDenied.set(true);
          return;
        }
      }

      this.accessDenied.set(false);
      this.error.set(false);
      this.loading.set(true);

      const subscription = this.farmUserService
        .listByFarm(farmId)
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (farmUsers) => this.farmUsers.set(farmUsers),
          error: (error: unknown) => this.handleListError(error),
        });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected retry(): void {
    this.reloadTrigger.update((value) => value + 1);
  }

  protected openLinkDrawer(): void {
    if (!this.canManageContext()) {
      return;
    }

    this.linkDrawerOpen.set(true);
    this.resetUserSearchState();

    if (this.sessionStore.isAdmin()) {
      this.loadAvailableUsers();
    }
  }

  protected closeLinkDrawer(): void {
    if (this.linkSubmitting()) {
      return;
    }

    this.linkDrawerOpen.set(false);
    this.availableUsersSubscription?.unsubscribe();
    this.availableUsersSubscription = null;
    this.resetUserSearchState();
  }

  protected retryAvailableUsers(): void {
    this.loadAvailableUsers();
  }

  protected clearUserSearchResult(): void {
    this.foundUser.set(null);
    this.userSearchError.set(null);
  }

  protected searchUserByEmail(email: string): void {
    if (this.sessionStore.isAdmin() || !this.canManageContext() || this.userSearchLoading()) {
      return;
    }

    this.foundUser.set(null);
    this.userSearchError.set(null);
    this.userSearchLoading.set(true);

    this.userService
      .searchByEmail(email)
      .pipe(
        finalize(() => this.userSearchLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => {
          if (!this.isValidSearchResult(user)) {
            return;
          }

          this.foundUser.set(user);
        },
        error: (error: unknown) => this.handleUserSearchError(error),
      });
  }

  protected linkUser(payload: CreateFarmUserRequest): void {
    const farmId = this.selectedFarmStore.selectedFarmId();

    if (
      !farmId ||
      this.linkSubmitting() ||
      !this.canManageContext() ||
      !this.allowedRoles().includes(payload.role)
    ) {
      return;
    }

    if (!this.sessionStore.isAdmin()) {
      const foundUser = this.foundUser();

      if (
        !foundUser ||
        payload.userId !== foundUser.id ||
        foundUser.userType === 'ADMIN' ||
        foundUser.status !== 'ACTIVE' ||
        !['EMPLOYEE', 'ACCOUNTANT'].includes(payload.role)
      ) {
        this.toastStore.error('Não foi possível concluir a ação. Verifique as regras do vínculo.');
        return;
      }
    }

    this.linkSubmitting.set(true);

    this.farmUserService
      .linkUser(farmId, payload)
      .pipe(
        finalize(() => this.linkSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.linkDrawerOpen.set(false);
          this.resetUserSearchState();
          this.toastStore.success('Usuário vinculado com sucesso.');
          this.retry();
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  protected openEditDrawer(farmUser: FarmUser): void {
    if (!this.canManageFarmUser(farmUser)) {
      return;
    }

    this.editTarget.set(farmUser);
  }

  protected closeEditDrawer(): void {
    if (this.roleSubmitting() || this.inactivationSubmitting()) {
      return;
    }

    this.editTarget.set(null);
    this.inactivationTarget.set(null);
  }

  protected updateRole(payload: UpdateFarmUserRoleRequest): void {
    const farmId = this.selectedFarmStore.selectedFarmId();
    const target = this.editTarget();

    if (
      !farmId ||
      !target ||
      this.roleSubmitting() ||
      !this.canManageFarmUser(target) ||
      !this.allowedRoles().includes(payload.role) ||
      payload.role === target.role
    ) {
      return;
    }

    this.roleSubmitting.set(true);

    this.farmUserService
      .updateRole(farmId, target.userId, payload)
      .pipe(
        finalize(() => this.roleSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.editTarget.set(null);
          this.toastStore.success('Papel atualizado com sucesso.');
          this.retry();
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  protected requestInactivation(farmUser: FarmUser): void {
    if (this.canManageFarmUser(farmUser)) {
      this.inactivationTarget.set(farmUser);
    }
  }

  protected closeInactivationConfirmation(): void {
    if (!this.inactivationSubmitting()) {
      this.inactivationTarget.set(null);
    }
  }

  protected confirmInactivation(): void {
    const farmId = this.selectedFarmStore.selectedFarmId();
    const target = this.inactivationTarget();

    if (
      !farmId ||
      !target ||
      this.inactivationSubmitting() ||
      !this.canManageFarmUser(target)
    ) {
      return;
    }

    this.inactivationSubmitting.set(true);

    this.farmUserService
      .inactivate(farmId, target.userId)
      .pipe(
        finalize(() => this.inactivationSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.inactivationSubmitting.set(false);
          this.closeEditDrawer();
          this.toastStore.success('Vínculo inativado com sucesso.');
          this.retry();
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  protected canManageFarmUser(farmUser: FarmUser): boolean {
    if (farmUser.userId === this.sessionStore.user()?.id) {
      this.toastStore.error('Você não pode alterar seu próprio vínculo por aqui.');
      return false;
    }

    if (!this.canManageContext() || farmUser.role === 'INACTIVE') {
      return false;
    }

    return (
      this.sessionStore.isAdmin() ||
      farmUser.role === 'EMPLOYEE' ||
      farmUser.role === 'ACCOUNTANT'
    );
  }

  protected canShowEditAction(farmUser: FarmUser): boolean {
    if (farmUser.userId === this.sessionStore.user()?.id) {
      return false;
    }

    if (!this.canManageContext() || farmUser.role === 'INACTIVE') {
      return false;
    }

    return (
      this.sessionStore.isAdmin() ||
      farmUser.role === 'EMPLOYEE' ||
      farmUser.role === 'ACCOUNTANT'
    );
  }

  protected isCurrentUser(farmUser: FarmUser): boolean {
    return farmUser.userId === this.sessionStore.user()?.id;
  }

  protected roleLabel(role: FarmUserRole | null): string {
    const labels: Record<string, string> = {
      PRODUCER: 'Produtor',
      EMPLOYEE: 'Funcionário',
      ACCOUNTANT: 'Contador',
      INACTIVE: 'Inativo',
    };

    return role ? (labels[role] ?? role) : 'Sem papel definido';
  }

  protected roleVariant(role: FarmUserRole): BadgeVariant {
    const variants: Record<string, BadgeVariant> = {
      PRODUCER: 'success',
      EMPLOYEE: 'info',
      ACCOUNTANT: 'neutral',
      INACTIVE: 'danger',
    };

    return variants[role] ?? 'default';
  }

  protected dateLabel(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Data não informada' : this.dateFormatter.format(date);
  }

  protected canManageContext(): boolean {
    const farmId = this.selectedFarmStore.selectedFarmId();

    if (!farmId) {
      return false;
    }

    if (this.sessionStore.isAdmin()) {
      return true;
    }

    return (
      this.farmAccessStore.access()?.farmId === farmId &&
      this.farmAccessStore.canManageFarmUsers()
    );
  }

  private loadAvailableUsers(): void {
    if (!this.canManageContext() || this.availableUsersLoading()) {
      return;
    }

    this.availableUsersSubscription?.unsubscribe();
    this.availableUsers.set([]);
    this.availableUsersError.set(false);
    this.availableUsersLoading.set(true);

    this.availableUsersSubscription = this.userService
      .list({ page: 0, size: 100, sort: 'name', direction: 'ASC' })
      .pipe(finalize(() => this.availableUsersLoading.set(false)))
      .subscribe({
        next: (response) => {
          const linkedUserIds = new Set(
            this.farmUsers()
              .filter((farmUser) => farmUser.role !== 'INACTIVE')
              .map((farmUser) => farmUser.userId),
          );

          this.availableUsers.set(
            response.content.filter(
              (user) =>
                user.userType === 'USER' &&
                user.status === 'ACTIVE' &&
                !linkedUserIds.has(user.id),
            ),
          );
        },
        error: (error: unknown) => {
          this.availableUsersError.set(true);
          this.showOperationError(error);
        },
      });
  }


  private isValidSearchResult(user: User): boolean {
    if (user.userType === 'ADMIN') {
      this.userSearchError.set('Não é possível vincular um administrador.');
      return false;
    }

    if (user.status !== 'ACTIVE') {
      this.userSearchError.set('Não é possível vincular um usuário inativo ou bloqueado.');
      return false;
    }

    return true;
  }

  private handleUserSearchError(error: unknown): void {
    this.foundUser.set(null);

    if (!(error instanceof HttpErrorResponse)) {
      this.userSearchError.set('Não foi possível pesquisar o usuário.');
      return;
    }

    const messages: Record<number, string> = {
      400: 'Informe um e-mail válido.',
      401: 'Sua sessão expirou. Faça login novamente.',
      403: 'Você não tem permissão para pesquisar usuários.',
      404: 'Usuário não encontrado.',
    };

    this.userSearchError.set(messages[error.status] ?? 'Não foi possível pesquisar o usuário.');
  }

  private handleListError(error: unknown): void {
    this.farmUsers.set([]);

    if (error instanceof HttpErrorResponse && error.status === 403) {
      this.accessDenied.set(true);
      return;
    }

    this.error.set(true);
  }

  private showOperationError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.toastStore.error('Não foi possível concluir a operação.');
      return;
    }

    const messages: Record<number, string> = {
      400: 'Não foi possível concluir a ação. Verifique as regras do vínculo.',
      401: 'Sua sessão expirou. Faça login novamente.',
      403: 'Você não tem permissão para realizar esta ação.',
      404: 'Fazenda, usuário ou vínculo não encontrado.',
    };

    this.toastStore.error(messages[error.status] ?? 'Não foi possível concluir a operação.');
  }

  private clearListState(): void {
    this.farmUsers.set([]);
    this.loading.set(false);
    this.error.set(false);
    this.accessDenied.set(false);
  }

  private resetTransientState(): void {
    this.availableUsersSubscription?.unsubscribe();
    this.availableUsersSubscription = null;
    this.linkDrawerOpen.set(false);
    this.availableUsers.set([]);
    this.availableUsersLoading.set(false);
    this.availableUsersError.set(false);
    this.resetUserSearchState();
    this.editTarget.set(null);
    this.inactivationTarget.set(null);
  }

  private resetUserSearchState(): void {
    this.foundUser.set(null);
    this.userSearchLoading.set(false);
    this.userSearchError.set(null);
  }
}
