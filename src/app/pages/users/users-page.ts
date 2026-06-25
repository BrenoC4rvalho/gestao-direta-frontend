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

import { PageResponse } from '../../core/models/page-response.model';
import { CreateUserRequest, User } from '../../core/models/user.models';
import { UserService } from '../../core/services/user.service';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { Drawer } from '../../shared/overlays';
import { Badge, BadgeVariant, Button, EmptyState, ErrorState, Skeleton } from '../../shared/ui';
import { UserForm } from './components/user-form/user-form';

@Component({
  selector: 'gd-users-page',
  imports: [Badge, Button, Drawer, EmptyState, ErrorState, Skeleton, UserForm],
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
  protected readonly skeletons = [1, 2, 3, 4, 5];

  protected readonly users = computed(() => this.response()?.content ?? []);
  protected readonly currentPage = computed(() => this.response()?.page ?? 0);
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
}
