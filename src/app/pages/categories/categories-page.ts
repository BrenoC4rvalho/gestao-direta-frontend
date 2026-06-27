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
import { finalize, forkJoin, map, Observable, of } from 'rxjs';

import {
  CreateFinancialCategoryRequest,
  FinancialCategory,
  FinancialCategoryType,
  isGlobalCategory,
  UpdateFinancialCategoryRequest,
} from '../../core/models/financial-category.models';
import { FinancialCategoryService } from '../../core/services/financial-category.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { GdSelectOption } from '../../shared/forms';
import { ConfirmDialog, Drawer } from '../../shared/overlays';
import { Badge, BadgeVariant, Button, Card, EmptyState, ErrorState, Skeleton } from '../../shared/ui';
import { CategoryCard } from './components/category-card/category-card';
import { CategoryForm } from './components/category-form/category-form';

interface CategoryLists {
  farm: FinancialCategory[];
  global: FinancialCategory[];
}

@Component({
  selector: 'gd-categories-page',
  imports: [
    Badge,
    Button,
    Card,
    CategoryCard,
    CategoryForm,
    ConfirmDialog,
    Drawer,
    EmptyState,
    ErrorState,
    Skeleton,
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

  protected readonly farmCategories = signal<FinancialCategory[]>([]);
  protected readonly globalCategories = signal<FinancialCategory[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly accessDenied = signal(false);
  protected readonly drawerOpen = signal(false);
  protected readonly editingCategory = signal<FinancialCategory | null>(null);
  protected readonly submitting = signal(false);
  protected readonly deleteTarget = signal<FinancialCategory | null>(null);
  protected readonly deleteSubmitting = signal(false);
  protected readonly skeletons = [1, 2, 3, 4, 5, 6];

  private readonly reloadTrigger = signal(0);

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
  protected readonly typeOptions = computed<readonly GdSelectOption[]>(() => {
    const category = this.editingCategory();

    if (category && isGlobalCategory(category) && this.sessionStore.isAdmin()) {
      return [
        { label: 'Receita', value: 'INCOME' },
        { label: 'Despesa', value: 'EXPENSE' },
        { label: 'Global', value: 'GLOBAL' },
      ];
    }

    return [
      { label: 'Receita', value: 'INCOME' },
      { label: 'Despesa', value: 'EXPENSE' },
    ];
  });
  protected readonly canViewCategories = computed(() => {
    if (this.sessionStore.isAdmin()) {
      return true;
    }

    const farmId = this.selectedFarmStore.selectedFarmId();

    return (
      !!farmId &&
      this.farmAccessStore.access()?.farmId === farmId &&
      (this.farmAccessStore.canViewFinancial() ||
        this.farmAccessStore.canManageCategories())
    );
  });

  constructor() {
    effect((onCleanup) => {
      const farmId = this.selectedFarmStore.selectedFarmId();
      const isAdmin = this.sessionStore.isAdmin();
      this.reloadTrigger();

      if (!isAdmin && farmId && this.isAccessPending()) {
        this.clearListState();
        return;
      }

      if (!isAdmin && !this.canViewCategories()) {
        this.clearListState();
        this.accessDenied.set(!!farmId);
        return;
      }

      this.accessDenied.set(false);
      this.error.set(false);
      this.loading.set(true);

      const subscription = this.buildListRequest(farmId, isAdmin)
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (lists) => {
            this.farmCategories.set(lists.farm);
            this.globalCategories.set(lists.global);
          },
          error: (error: unknown) => this.handleListError(error),
        });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected retry(): void {
    this.reloadTrigger.update((value) => value + 1);
  }

  protected openCreateDrawer(): void {
    if (!this.canCreateFarmCategory()) {
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

  protected saveCategory(payload: UpdateFinancialCategoryRequest): void {
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

  protected closeDeleteConfirmation(): void {
    if (!this.deleteSubmitting()) {
      this.deleteTarget.set(null);
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
          this.toastStore.success('Categoria inativada com sucesso.');
          this.retry();
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  protected canEditCategory(category: FinancialCategory): boolean {
    if (isGlobalCategory(category)) {
      return this.sessionStore.isAdmin();
    }

    return this.sessionStore.isAdmin() || this.canManageSelectedFarmCategory();
  }

  protected canDeleteCategory(category: FinancialCategory): boolean {
    if (category.status === 'INACTIVE') {
      return false;
    }

    if (isGlobalCategory(category)) {
      return this.sessionStore.isAdmin();
    }

    return this.sessionStore.isAdmin() || this.canManageSelectedFarmCategory();
  }

  protected canCreateFarmCategory(): boolean {
    return (
      this.selectedFarmStore.selectedFarmId() !== null &&
      (this.sessionStore.isAdmin() || this.canManageSelectedFarmCategory())
    );
  }

  protected typeLabel(type: FinancialCategoryType): string {
    const labels: Record<string, string> = {
      INCOME: 'Receita',
      EXPENSE: 'Despesa',
      GLOBAL: 'Global',
    };

    return labels[type] ?? type;
  }

  protected typeVariant(type: FinancialCategoryType): BadgeVariant {
    const variants: Record<string, BadgeVariant> = {
      INCOME: 'success',
      EXPENSE: 'warning',
      GLOBAL: 'info',
    };

    return variants[type] ?? 'neutral';
  }

  private createCategory(payload: UpdateFinancialCategoryRequest): void {
    const farmId = this.selectedFarmStore.selectedFarmId();

    if (!farmId || this.submitting() || !this.canCreateFarmCategory()) {
      this.showPermissionError();
      return;
    }

    const request: CreateFinancialCategoryRequest = {
      name: payload.name,
      type: payload.type,
      farmId,
      isDefault: false,
    };

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
    if (this.submitting() || !this.canEditCategory(category)) {
      this.showPermissionError();
      return;
    }

    const request: UpdateFinancialCategoryRequest = {
      name: payload.name,
      type: payload.type,
      farmId: isGlobalCategory(category) ? null : category.farmId,
      isDefault: isGlobalCategory(category),
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

  private buildListRequest(
    farmId: number | null,
    isAdmin: boolean,
  ): Observable<CategoryLists> {
    if (isAdmin) {
      const global$ = this.categoryService.listGlobal();
      const farm$ = farmId ? this.categoryService.listByFarm(farmId) : of([]);

      return forkJoin({ global: global$, farm: farm$ }).pipe(
        map(({ global, farm }) => ({
          global,
          farm: farm.filter((category) => !isGlobalCategory(category)),
        })),
      );
    }

    if (!farmId) {
      return of({ farm: [], global: [] });
    }

    return this.categoryService.listByFarm(farmId).pipe(
      map((categories) => ({
        farm: categories.filter((category) => !isGlobalCategory(category)),
        global: categories.filter((category) => isGlobalCategory(category)),
      })),
    );
  }

  private canManageSelectedFarmCategory(): boolean {
    const farmId = this.selectedFarmStore.selectedFarmId();

    return (
      !!farmId &&
      this.farmAccessStore.access()?.farmId === farmId &&
      this.farmAccessStore.canManageCategories()
    );
  }

  private isAccessPending(): boolean {
    return (
      this.farmAccessStore.loading() ||
      (!this.farmAccessStore.access() && !this.farmAccessStore.error())
    );
  }

  private handleListError(error: unknown): void {
    this.farmCategories.set([]);
    this.globalCategories.set([]);

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
      400: 'Verifique os dados da categoria.',
      401: 'Sua sessão expirou. Faça login novamente.',
      403: 'Você não tem permissão para realizar esta ação.',
      404: 'Categoria não encontrada.',
    };

    this.toastStore.error(messages[error.status] ?? 'Não foi possível concluir a operação.');
  }

  private showPermissionError(): void {
    this.toastStore.error('Você não tem permissão para realizar esta ação.');
  }

  private clearListState(): void {
    this.farmCategories.set([]);
    this.globalCategories.set([]);
    this.loading.set(false);
    this.error.set(false);
    this.accessDenied.set(false);
  }
}
