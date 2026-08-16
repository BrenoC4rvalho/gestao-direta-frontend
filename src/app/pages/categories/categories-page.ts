import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  CreateFinancialCategoryRequest,
  FinancialCategory,
  FinancialCategoryFormType,
  UpdateFinancialCategoryRequest,
} from '../../core/models/financial-category.models';
import { PageResponse } from '../../core/models/page-response.model';
import { FinancialCategoryService } from '../../core/services/financial-category.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { GdSelectOption } from '../../shared/forms';
import { ConfirmDialog, Drawer } from '../../shared/overlays';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListFilters,
  ListFiltersConfig,
  ListFilterValues,
  Skeleton,
  StatusActionSection,
} from '../../shared/ui';
import { CategoryCard } from './components/category-card/category-card';
import { CategoryForm, CategoryFormPayload } from './components/category-form/category-form';
import { RegistrationsTabs } from '../registrations/components/registrations-tabs/registrations-tabs';

@Component({
  selector: 'gd-categories-page',
  imports: [
    Button,
    Card,
    CategoryCard,
    CategoryForm,
    ConfirmDialog,
    Drawer,
    EmptyState,
    ErrorState,
    ListFilters,
    RegistrationsTabs,
    Skeleton,
    StatusActionSection,
  ],
  templateUrl: './categories-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesPage {
  private readonly categoryService = inject(FinancialCategoryService);
  private readonly toastStore = inject(ToastStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly farmAccessStore = inject(FarmAccessStore);
  protected readonly sessionStore = inject(SessionStore);

  protected readonly response = signal<PageResponse<FinancialCategory> | null>(null);
  protected readonly categories = computed(() => this.response()?.content ?? []);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly accessDenied = signal(false);
  protected readonly drawerOpen = signal(false);
  protected readonly editingCategory = signal<FinancialCategory | null>(null);
  protected readonly submitting = signal(false);
  protected readonly deleteTarget = signal<FinancialCategory | null>(null);
  protected readonly deleteSubmitting = signal(false);
  protected readonly activateTarget = signal<FinancialCategory | null>(null);
  protected readonly activateSubmitting = signal(false);
  protected readonly skeletons = [1, 2, 3, 4, 5, 6];

  private readonly reloadTrigger = signal(0);
  private readonly page = signal(0);
  private readonly searchTerm = signal<string | null>(null);
  private readonly selectedStatus = signal<string | null>(null);
  private readonly allowedFormTypes = new Set<FinancialCategoryFormType>(['INCOME', 'EXPENSE']);
  private lastFarmId: number | null = null;

  protected readonly filtersConfig: ListFiltersConfig = {
    subtitle: 'Busque e filtre categorias financeiras',
    search: { placeholder: 'Buscar por nome' },
    quickFilters: [
      {
        key: 'status',
        label: 'Status',
        options: [
          { label: 'Todas', value: null },
          { label: 'Ativas', value: 'ACTIVE' },
          { label: 'Inativas', value: 'INACTIVE' },
        ],
      },
    ],
  };
  protected readonly currentPage = computed(() => this.response()?.page ?? 0);
  protected readonly hasActiveFilters = computed(
    () => this.searchTerm() !== null || this.selectedStatus() !== null,
  );

  protected readonly selectedFarmName = computed(
    () => this.selectedFarmStore.selectedFarm()?.name ?? null,
  );
  protected readonly drawerTitle = computed(() =>
    this.editingCategory() ? 'Editar categoria' : 'Nova categoria',
  );
  protected readonly drawerDescription = computed(() =>
    this.editingCategory()
      ? 'Atualize os dados da categoria financeira.'
      : 'Crie uma categoria para organizar as movimentações da fazenda.',
  );
  protected readonly typeOptions: readonly GdSelectOption[] = [
    { label: 'Receita', value: 'INCOME' },
    { label: 'Despesa', value: 'EXPENSE' },
  ];
  protected readonly canViewCategories = computed(() => {
    if (this.sessionStore.isAdmin()) {
      return true;
    }

    const farmId = this.selectedFarmStore.selectedFarmId();
    const access = this.farmAccessStore.access();

    return (
      !!farmId &&
      access?.farmId === farmId &&
      (this.farmAccessStore.canViewFinancial() || this.farmAccessStore.canManageCategories())
    );
  });

  constructor() {
    effect((onCleanup) => {
      const farmId = this.selectedFarmStore.selectedFarmId();
      const isAdmin = this.sessionStore.isAdmin();
      this.reloadTrigger();
      const page = this.page();
      const search = this.searchTerm();
      const status = this.selectedStatus();

      if (farmId !== this.lastFarmId) {
        this.lastFarmId = farmId;
        untracked(() => this.resetFarmScopedState());
      }

      if (!farmId) {
        this.clearListState();
        return;
      }

      if (!isAdmin && this.isAccessPending()) {
        this.clearListState();
        return;
      }

      if (!isAdmin && !this.canViewCategories()) {
        this.clearListState();
        this.accessDenied.set(true);
        return;
      }

      this.accessDenied.set(false);
      this.error.set(false);
      this.loading.set(true);

      const subscription = this.categoryService
        .listPageByFarm(farmId, {
          includeInactive: true,
          search,
          status,
          page,
          size: 20,
          sort: 'name',
          direction: 'ASC',
        })
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (response) => this.response.set(response),
          error: (error: unknown) => this.handleListError(error),
        });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected retry(): void {
    this.reloadTrigger.update((value) => value + 1);
  }

  protected changeFilters(filters: ListFilterValues): void {
    const value = (filters['status'] ?? null) as string | null;
    this.searchTerm.set((filters['search'] ?? null) as string | null);
    this.selectedStatus.set(Array.isArray(value) ? (value[0] ?? null) : value);
    this.page.set(0);
  }

  protected previousPage(): void {
    const response = this.response();
    if (response && !response.first) this.page.set(response.page - 1);
  }

  protected nextPage(): void {
    const response = this.response();
    if (response && !response.last) this.page.set(response.page + 1);
  }

  protected openCreateDrawer(): void {
    if (!this.selectedFarmStore.selectedFarmId()) {
      this.toastStore.error('Selecione uma fazenda para criar categorias.');
      return;
    }

    if (!this.canCreateCategory()) {
      this.showPermissionError();
      return;
    }

    this.editingCategory.set(null);
    this.drawerOpen.set(true);
  }

  protected openEditDrawer(category: FinancialCategory): void {
    if (!this.canEditCategory(category)) {
      this.showPermissionError();
      return;
    }

    this.editingCategory.set(category);
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    if (this.submitting()) {
      return;
    }

    this.drawerOpen.set(false);
    this.editingCategory.set(null);
  }

  protected saveCategory(payload: CategoryFormPayload): void {
    const editingCategory = this.editingCategory();

    if (editingCategory) {
      this.updateCategory(editingCategory, payload);
      return;
    }

    this.createCategory(payload);
  }

  protected requestDelete(category: FinancialCategory): void {
    if (!this.canDeleteCategory(category)) {
      this.showPermissionError();
      return;
    }

    this.deleteTarget.set(category);
  }

  protected requestActivate(category: FinancialCategory): void {
    if (!this.canActivateCategory(category)) {
      this.showPermissionError();
      return;
    }

    this.activateTarget.set(category);
  }

  protected closeDeleteConfirmation(): void {
    if (!this.deleteSubmitting()) {
      this.deleteTarget.set(null);
    }
  }

  protected closeActivateConfirmation(): void {
    if (!this.activateSubmitting()) {
      this.activateTarget.set(null);
    }
  }

  protected confirmDelete(): void {
    const category = this.deleteTarget();

    if (!category || this.deleteSubmitting()) {
      return;
    }

    if (!this.canDeleteCategory(category)) {
      this.showPermissionError();
      return;
    }

    this.deleteSubmitting.set(true);

    this.categoryService
      .delete(category.id)
      .pipe(
        finalize(() => this.deleteSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.deleteTarget.set(null);
          this.drawerOpen.set(false);
          this.editingCategory.set(null);
          this.toastStore.success('Categoria inativada com sucesso.');
          this.retry();
        },
        error: () => this.showStatusChangeError(),
      });
  }

  protected confirmActivate(): void {
    const category = this.activateTarget();

    if (!category || this.activateSubmitting()) {
      return;
    }

    if (!this.canActivateCategory(category)) {
      this.showPermissionError();
      return;
    }

    this.activateSubmitting.set(true);

    this.categoryService
      .activate(category.id)
      .pipe(
        finalize(() => this.activateSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.activateTarget.set(null);
          this.drawerOpen.set(false);
          this.editingCategory.set(null);
          this.toastStore.success('Categoria ativada com sucesso.');
          this.retry();
        },
        error: () => this.showStatusChangeError(),
      });
  }

  protected canEditCategory(_category: FinancialCategory): boolean {
    return this.canManageSelectedFarmCategory();
  }

  protected canDeleteCategory(category: FinancialCategory): boolean {
    return category.status === 'ACTIVE' && this.canManageSelectedFarmCategory();
  }

  protected canActivateCategory(category: FinancialCategory): boolean {
    return category.status === 'INACTIVE' && this.canManageSelectedFarmCategory();
  }

  protected canCreateCategory(): boolean {
    return this.selectedFarmStore.selectedFarmId() !== null && this.canManageSelectedFarmCategory();
  }

  private createCategory(payload: CategoryFormPayload): void {
    const farmId = this.selectedFarmStore.selectedFarmId();

    if (!farmId) {
      this.toastStore.error('Selecione uma fazenda para criar categorias.');
      return;
    }

    if (this.submitting() || !this.canCreateCategory() || !this.isAllowedFormType(payload.type)) {
      this.showPermissionError();
      return;
    }

    const request: CreateFinancialCategoryRequest = {
      name: payload.name,
      type: payload.type,
      farmId,
    };

    this.submitCreateCategory(request);
  }

  private submitCreateCategory(request: CreateFinancialCategoryRequest): void {
    this.submitting.set(true);

    this.categoryService
      .create(request)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.drawerOpen.set(false);
          this.toastStore.success('Categoria criada com sucesso.');
          this.retry();
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  private updateCategory(
    category: FinancialCategory,
    payload: UpdateFinancialCategoryRequest,
  ): void {
    if (
      this.submitting() ||
      !this.canEditCategory(category) ||
      !this.isAllowedFormType(payload.type)
    ) {
      this.showPermissionError();
      return;
    }

    const request: UpdateFinancialCategoryRequest = {
      name: payload.name,
      type: payload.type,
    };

    this.submitting.set(true);

    this.categoryService
      .update(category.id, request)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.drawerOpen.set(false);
          this.editingCategory.set(null);
          this.toastStore.success('Categoria atualizada com sucesso.');
          this.retry();
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  private canManageSelectedFarmCategory(): boolean {
    if (this.sessionStore.isAdmin()) {
      return this.selectedFarmStore.selectedFarmId() !== null;
    }

    const farmId = this.selectedFarmStore.selectedFarmId();
    const access = this.farmAccessStore.access();

    return !!farmId && access?.farmId === farmId && this.farmAccessStore.role() === 'PRODUCER';
  }

  private isAccessPending(): boolean {
    return (
      this.farmAccessStore.loading() ||
      (!this.farmAccessStore.access() && !this.farmAccessStore.error())
    );
  }

  private handleListError(error: unknown): void {
    this.response.set(null);

    if (error instanceof HttpErrorResponse && error.status === 403) {
      this.accessDenied.set(true);
      return;
    }

    this.error.set(true);
  }

  private isAllowedFormType(type: string): type is FinancialCategoryFormType {
    return type === 'INCOME' || type === 'EXPENSE';
  }

  private showOperationError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.toastStore.error('Não foi possível concluir a operação.');
      return;
    }

    const messages: Record<number, string> = {
      400: 'Verifique os dados da categoria.',
      401: 'Sua sessão expirou. Faça login novamente.',
      403: 'Você não tem permissão para realizar esta ação.',
      404: 'Categoria não encontrada.',
    };

    this.toastStore.error(messages[error.status] ?? 'Não foi possível concluir a operação.');
  }

  private showStatusChangeError(): void {
    this.toastStore.error('Não foi possível alterar o status da categoria.');
  }

  private showPermissionError(): void {
    this.toastStore.error('Você não tem permissão para realizar esta ação.');
  }

  private resetFarmScopedState(): void {
    this.response.set(null);
    this.error.set(false);
    this.page.set(0);
    this.searchTerm.set(null);
    this.selectedStatus.set(null);
    this.deleteTarget.set(null);
    this.activateTarget.set(null);
    this.editingCategory.set(null);
    this.drawerOpen.set(false);
  }

  private clearListState(): void {
    this.response.set(null);
    this.loading.set(false);
    this.error.set(false);
    this.accessDenied.set(false);
  }
}
