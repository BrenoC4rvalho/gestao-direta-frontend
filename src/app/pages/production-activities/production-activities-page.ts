import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { finalize, Observable } from 'rxjs';

import { PageResponse } from '../../core/models/page-response.model';
import {
  ProductionActivity,
  ProductionActivityListParams,
  ProductionActivityStatus,
  UpdateProductionActivityRequest,
} from '../../core/models/production-activity.models';
import { ProductionActivityService } from '../../core/services/production-activity.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { GdFormControl, GdFormValue, Input, Textarea } from '../../shared/forms';
import { ConfirmDialog, ConfirmDialogVariant, Drawer } from '../../shared/overlays';
import {
  Badge,
  BadgeVariant,
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
import { RegistrationsTabs } from '../registrations/components/registrations-tabs/registrations-tabs';

type ProductionActivityStatusFilter = ProductionActivityStatus | null;
type DrawerMode = 'create' | 'edit';

interface ProductionActivityFormControls {
  name: GdFormControl;
  description: GdFormControl;
}

interface DrawerState {
  mode: DrawerMode;
  activity: ProductionActivity | null;
}

interface StatusConfirmation {
  title: string;
  description: string;
  confirmLabel: string;
  variant: ConfirmDialogVariant;
}

@Component({
  selector: 'gd-production-activities-page',
  imports: [
    Badge,
    Button,
    Card,
    ConfirmDialog,
    Drawer,
    EmptyState,
    ErrorState,
    Input,
    ListFilters,
    LucideDynamicIcon,
    ReactiveFormsModule,
    RegistrationsTabs,
    Skeleton,
    StatusActionSection,
    Textarea,
  ],
  templateUrl: './production-activities-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionActivitiesPage {
  private readonly activityService = inject(ProductionActivityService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastStore = inject(ToastStore);
  protected readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly farmAccessStore = inject(FarmAccessStore);
  protected readonly sessionStore = inject(SessionStore);

  private readonly searchTerm = signal('');
  private readonly selectedStatus = signal<ProductionActivityStatusFilter>(null);
  private readonly reloadTrigger = signal(0);
  private currentFarmId: number | null = null;

  protected readonly response = signal<PageResponse<ProductionActivity> | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly accessDenied = signal(false);
  protected readonly drawerOpen = signal(false);
  protected readonly drawerState = signal<DrawerState>({ mode: 'create', activity: null });
  protected readonly submitting = signal(false);
  protected readonly statusTarget = signal<ProductionActivity | null>(null);
  protected readonly statusSubmitting = signal(false);
  protected readonly skeletons = [1, 2, 3, 4, 5];
  protected readonly selectedFarmName = computed(
    () => this.selectedFarmStore.selectedFarm()?.name ?? null,
  );
  protected readonly canManageActivities = computed(() => {
    if (this.sessionStore.isAdmin()) {
      return this.selectedFarmStore.selectedFarmId() !== null;
    }

    const farmId = this.selectedFarmStore.selectedFarmId();

    return (
      !!farmId &&
      this.farmAccessStore.access()?.farmId === farmId &&
      this.farmAccessStore.role() === 'PRODUCER'
    );
  });
  protected readonly canViewActivities = computed(() => {
    if (this.sessionStore.isAdmin()) {
      return this.selectedFarmStore.selectedFarmId() !== null;
    }

    const farmId = this.selectedFarmStore.selectedFarmId();
    const role = this.farmAccessStore.role();

    return (
      !!farmId &&
      this.farmAccessStore.access()?.farmId === farmId &&
      (role === 'PRODUCER' || role === 'EMPLOYEE' || role === 'ACCOUNTANT')
    );
  });
  protected readonly filtersConfig: ListFiltersConfig = {
    subtitle: 'Busque e filtre atividades produtivas',
    search: { placeholder: 'Buscar por nome ou descrição' },
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

  protected readonly form = new FormGroup<ProductionActivityFormControls>({
    name: new FormControl<GdFormValue>('', { validators: [Validators.required] }),
    description: new FormControl<GdFormValue>(''),
  });

  protected readonly activities = computed(() => {
    const search = this.normalizeText(this.searchTerm());
    const activities = this.response()?.content ?? [];

    return activities.filter((activity) => {
      if (!search) {
        return true;
      }

      return (
        this.normalizeText(activity.name).includes(search) ||
        this.normalizeText(activity.description ?? '').includes(search)
      );
    });
  });
  protected readonly currentPage = computed(() => this.response()?.page ?? 0);
  protected readonly hasActiveFilters = computed(
    () => this.selectedStatus() !== null || this.searchTerm().length > 0,
  );
  protected readonly emptyStateTitle = computed(() =>
    this.hasActiveFilters()
      ? 'Nenhuma atividade produtiva encontrada para os filtros informados.'
      : 'Nenhuma atividade produtiva cadastrada.',
  );
  protected readonly emptyStateDescription = computed(() =>
    this.hasActiveFilters()
      ? 'Ajuste a busca ou o filtro de status.'
      : 'Crie atividades produtivas para usá-las no planejamento das safras.',
  );

  protected readonly drawerTitle = computed(() =>
    this.drawerState().mode === 'edit' ? 'Editar atividade produtiva' : 'Nova atividade produtiva',
  );
  protected readonly drawerDescription = computed(() =>
    this.drawerState().mode === 'edit'
      ? 'Atualize os dados da atividade produtiva.'
      : 'Cadastre uma atividade produtiva para uso em safras.',
  );
  protected readonly statusConfirmation = computed<StatusConfirmation>(() => {
    const target = this.statusTarget();
    const activating = target?.status === 'INACTIVE';

    return activating
      ? {
          title: 'Ativar atividade produtiva?',
          description: 'Esta atividade voltará a ficar disponível para novas safras.',
          confirmLabel: 'Ativar',
          variant: 'success',
        }
      : {
          title: 'Inativar atividade produtiva?',
          description:
            'Esta atividade não ficará disponível para novas safras, mas registros existentes serão preservados.',
          confirmLabel: 'Inativar',
          variant: 'warning',
        };
  });

  constructor() {
    effect((onCleanup) => {
      const farmId = this.selectedFarmStore.selectedFarmId();
      const isAdmin = this.sessionStore.isAdmin();
      this.reloadTrigger();

      if (this.currentFarmId !== farmId) {
        this.currentFarmId = farmId;
        this.resetForFarmChange();
      }

      if (!farmId) {
        this.clearListState();
        return;
      }

      if (!isAdmin && this.isAccessPending()) {
        this.clearListState();
        return;
      }

      if (!this.canViewActivities()) {
        this.clearListState();
        this.accessDenied.set(true);
        return;
      }

      this.accessDenied.set(false);
      this.error.set(false);
      this.loading.set(true);

      const subscription = this.activityService
        .list(this.listParams(farmId, 0, 10))
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (response) => this.response.set(response),
          error: (error: unknown) => this.handleListError(error),
        });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected retry(): void {
    this.loadPage(this.currentPage());
  }

  protected changeFilters(filters: ListFilterValues): void {
    const status = this.firstFilterValue(filters['status']) as ProductionActivityStatusFilter;

    this.searchTerm.set(this.firstFilterValue(filters['search']) ?? '');
    this.selectedStatus.set(status);
  }

  private firstFilterValue(value: string | string[] | null | undefined): string | null {
    return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
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
    if (!this.canManageActivities()) {
      this.showPermissionError();
      return;
    }

    this.drawerState.set({ mode: 'create', activity: null });
    this.form.reset({ name: '', description: '' });
    this.drawerOpen.set(true);
  }

  protected openEditDrawer(activity: ProductionActivity): void {
    if (!this.canManageActivities()) {
      this.showPermissionError();
      return;
    }

    this.drawerState.set({ mode: 'edit', activity });
    this.form.reset({
      name: activity.name,
      description: activity.description ?? '',
    });
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    if (this.submitting()) {
      return;
    }

    this.drawerOpen.set(false);
    this.drawerState.set({ mode: 'create', activity: null });
    this.statusTarget.set(null);
    this.statusSubmitting.set(false);
  }

  protected saveActivity(): void {
    const name = this.stringValue(this.form.controls.name.value);
    const description = this.stringValue(this.form.controls.description.value);

    if (!name) {
      this.form.controls.name.setErrors({ required: true });
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const state = this.drawerState();
    const farmId = this.selectedFarmStore.selectedFarmId();

    if (state.mode === 'create' && !farmId) {
      this.toastStore.error('Selecione uma fazenda para criar atividades produtivas.');
      return;
    }

    const editablePayload: UpdateProductionActivityRequest = {
      name,
      description: description || null,
    };

    this.submitting.set(true);

    const request$ =
      state.mode === 'edit' && state.activity
        ? this.activityService.update(state.activity.id, editablePayload)
        : this.activityService.create({ farmId: farmId as number, ...editablePayload });

    request$
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.drawerOpen.set(false);
          this.toastStore.success(
            state.mode === 'edit'
              ? 'Atividade produtiva atualizada com sucesso.'
              : 'Atividade produtiva criada com sucesso.',
          );
          this.loadPage(this.currentPage());
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  protected requestStatusToggle(activity: ProductionActivity): void {
    if (!this.canManageActivities()) {
      this.showPermissionError();
      return;
    }

    this.statusTarget.set(activity);
  }

  protected closeStatusConfirmation(): void {
    if (!this.statusSubmitting()) {
      this.statusTarget.set(null);
    }
  }

  protected confirmStatusToggle(): void {
    const target = this.statusTarget();

    if (!target || this.statusSubmitting()) {
      return;
    }

    this.statusSubmitting.set(true);

    const activating = target.status === 'INACTIVE';
    const request$: Observable<ProductionActivity | void> = activating
      ? this.activityService.activate(target.id)
      : this.activityService.inactivate(target.id);

    request$
      .pipe(
        finalize(() => this.statusSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (activity) => {
          if (activity) {
            this.drawerState.update((state) =>
              state.activity?.id === activity.id ? { ...state, activity } : state,
            );
          } else {
            this.drawerState.update((state) =>
              state.activity?.id === target.id
                ? { ...state, activity: { ...target, status: 'INACTIVE' } }
                : state,
            );
          }
          this.statusTarget.set(null);
          this.toastStore.success(
            activating
              ? 'Atividade produtiva ativada com sucesso.'
              : 'Atividade produtiva inativada com sucesso.',
          );
          this.closeDrawer();
          this.loadPage(this.currentPage());
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  protected statusLabel(status: string): string {
    const labels: Record<ProductionActivityStatus, string> = {
      ACTIVE: 'Ativa',
      INACTIVE: 'Inativa',
    };

    return labels[status as ProductionActivityStatus] ?? status;
  }

  protected statusVariant(status: string): BadgeVariant {
    return status === 'ACTIVE' ? 'success' : 'danger';
  }

  protected nameErrorMessage(): string | null {
    return this.form.controls.name.hasError('required')
      ? 'Informe o nome da atividade produtiva.'
      : null;
  }

  private loadPage(page: number): void {
    const farmId = this.selectedFarmStore.selectedFarmId();

    if (!farmId || !this.canViewActivities()) {
      return;
    }

    const params = this.listParams(farmId, page, this.response()?.size ?? 10);

    this.error.set(false);
    this.loading.set(true);

    this.activityService
      .list(params)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.response.set(response),
        error: (error: unknown) => this.handleListError(error),
      });
  }

  private handleListError(error: unknown): void {
    this.response.set(null);

    if (error instanceof HttpErrorResponse && error.status === 403) {
      this.toastStore.error('Você não tem permissão para visualizar atividades produtivas.');
    }

    this.error.set(true);
  }

  private showOperationError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.toastStore.error('Não foi possível concluir a operação.');
      return;
    }

    const messages: Record<number, string> = {
      400: 'Verifique os dados da atividade produtiva.',
      401: 'Sua sessão expirou. Faça login novamente.',
      403: 'Você não tem permissão para realizar esta ação.',
      404: 'Atividade produtiva não encontrada.',
    };

    this.toastStore.error(messages[error.status] ?? 'Não foi possível concluir a operação.');
  }

  private listParams(farmId: number, page: number, size: number): ProductionActivityListParams {
    return {
      farmId,
      search: this.searchTerm(),
      page,
      size,
      sort: 'name',
      direction: 'ASC',
      status: this.selectedStatus(),
    };
  }

  private resetForFarmChange(): void {
    this.searchTerm.set('');
    this.selectedStatus.set(null);
    this.response.set(null);
    this.error.set(false);
    this.accessDenied.set(false);
    this.drawerOpen.set(false);
    this.drawerState.set({ mode: 'create', activity: null });
    this.statusTarget.set(null);
    this.statusSubmitting.set(false);
    this.form.reset({ name: '', description: '' });
  }

  private clearListState(): void {
    this.response.set(null);
    this.error.set(false);
    this.accessDenied.set(false);
    this.loading.set(false);
  }

  private isAccessPending(): boolean {
    return (
      this.farmAccessStore.loading() ||
      (!this.farmAccessStore.access() && !this.farmAccessStore.error())
    );
  }

  private showPermissionError(): void {
    this.toastStore.error('Você não tem permissão para gerenciar atividades produtivas.');
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private stringValue(value: GdFormValue): string {
    return `${value ?? ''}`.trim();
  }
}
