import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  CreateFarmRequest,
  Farm,
  FarmListParams,
  FarmStatus,
  UpdateFarmRequest,
} from '../../core/models/farm.models';
import { PageResponse } from '../../core/models/page-response.model';
import { FarmService } from '../../core/services/farm.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { ConfirmDialog, ConfirmDialogVariant, Drawer } from '../../shared/overlays';
import {
  Button,
  EmptyState,
  ErrorState,
  ListFilters,
  ListFiltersConfig,
  Skeleton,
  StatusActionSection,
} from '../../shared/ui';
import { FarmCard } from './components/farm-card/farm-card';
import { FarmForm } from './components/farm-form/farm-form';

interface StatusConfirmation {
  title: string;
  description: string;
  confirmLabel: string;
  variant: ConfirmDialogVariant;
  nextStatus: FarmStatus;
}

@Component({
  selector: 'gd-farms-page',
  imports: [
    Button,
    ConfirmDialog,
    Drawer,
    EmptyState,
    ErrorState,
    FarmCard,
    ListFilters,
    FarmForm,
    Skeleton,
    StatusActionSection,
  ],
  templateUrl: './farms-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmsPage implements OnInit {
  private readonly farmService = inject(FarmService);
  private readonly toastStore = inject(ToastStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly farmAccessStore = inject(FarmAccessStore);
  protected readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly sessionStore = inject(SessionStore);
  protected readonly response = signal<PageResponse<Farm> | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly drawerOpen = signal(false);
  protected readonly editingFarm = signal<Farm | null>(null);
  protected readonly submitting = signal(false);
  protected readonly statusTarget = signal<Farm | null>(null);
  protected readonly statusSubmitting = signal(false);
  protected readonly skeletons = [1, 2, 3, 4, 5, 6];
  protected readonly filters = signal<
    Pick<FarmListParams, 'search' | 'document' | 'productionType' | 'status'>
  >({
    search: null,
    document: null,
    productionType: null,
    status: null,
  });
  protected readonly filtersConfig: ListFiltersConfig = {
    search: { placeholder: 'Buscar por nome da fazenda' },
    textFields: [{ key: 'document', label: 'CPF/CNPJ', placeholder: 'CPF ou CNPJ' }],
    selects: [
      {
        key: 'productionType',
        label: 'Tipo de produção',
        options: [
          { label: 'Todos', value: null },
          { label: 'Agricultura', value: 'AGRICULTURE' },
          { label: 'Pecuária', value: 'LIVESTOCK' },
          { label: 'Mista', value: 'MIXED' },
          { label: 'Outro', value: 'OTHER' },
        ],
      },
      {
        key: 'status',
        label: 'Status',
        options: [
          { label: 'Todos', value: null },
          { label: 'Ativa', value: 'ACTIVE' },
          { label: 'Inativa', value: 'INACTIVE' },
        ],
      },
    ],
  };

  protected readonly farms = computed(() => this.response()?.content ?? []);
  protected readonly hasActiveFilters = computed(() =>
    Object.values(this.filters()).some((value) => value !== null),
  );
  protected readonly emptyFarmsDescription = computed(() =>
    this.hasActiveFilters()
      ? 'Nenhum resultado encontrado para os filtros informados.'
      : 'Quando houver fazendas disponíveis, elas aparecerão aqui.',
  );
  protected readonly currentPage = computed(() => this.response()?.page ?? 0);
  protected readonly drawerTitle = computed(() =>
    this.editingFarm() ? 'Editar fazenda' : 'Nova fazenda',
  );
  protected readonly drawerDescription = computed(() =>
    this.editingFarm()
      ? 'Atualize os dados cadastrais da propriedade.'
      : 'Preencha os dados principais da propriedade.',
  );
  protected readonly statusConfirmation = computed<StatusConfirmation>(() => {
    const activating = this.statusTarget()?.status === 'INACTIVE';

    return activating
      ? {
          title: 'Ativar fazenda',
          description: 'Esta fazenda voltará a ficar disponível.',
          confirmLabel: 'Ativar',
          variant: 'info',
          nextStatus: 'ACTIVE',
        }
      : {
          title: 'Inativar fazenda',
          description: 'Esta fazenda deixará de ficar disponível para uso operacional.',
          confirmLabel: 'Inativar',
          variant: 'warning',
          nextStatus: 'INACTIVE',
        };
  });

  ngOnInit(): void {
    this.loadPage(0);
  }

  protected retry(): void {
    this.loadPage(this.currentPage());
  }

  protected changeFilters(filters: Record<string, string | null>): void {
    this.filters.set({
      search: filters['search'],
      document: filters['document'],
      productionType: filters['productionType'] as FarmListParams['productionType'],
      status: filters['status'] as FarmListParams['status'],
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
    if (!this.sessionStore.isAdmin()) {
      return;
    }

    this.editingFarm.set(null);
    this.drawerOpen.set(true);
  }

  protected openEditDrawer(farm: Farm): void {
    if (!this.canEditFarm(farm)) {
      return;
    }

    this.editingFarm.set(farm);
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    if (this.submitting()) {
      return;
    }

    this.drawerOpen.set(false);
    this.editingFarm.set(null);
    this.statusTarget.set(null);
    this.statusSubmitting.set(false);
  }

  protected saveFarm(payload: CreateFarmRequest): void {
    const editingFarm = this.editingFarm();

    if (
      this.submitting() ||
      (!editingFarm && !this.sessionStore.isAdmin()) ||
      (editingFarm && !this.canEditFarm(editingFarm))
    ) {
      return;
    }

    const request$ = editingFarm
      ? this.farmService.update(editingFarm.id, payload as UpdateFarmRequest)
      : this.farmService.create(payload);

    this.submitting.set(true);

    request$
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (farm) => {
          this.selectedFarmStore.upsertFarm(farm);
          this.toastStore.success(
            editingFarm ? 'Fazenda atualizada.' : 'Fazenda criada.',
          );
          this.closeDrawer();
          this.loadPage(this.currentPage());
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  protected requestStatusChange(farm: Farm): void {
    if (this.canManageStatus(farm)) {
      this.statusTarget.set(farm);
    }
  }

  protected closeStatusConfirmation(): void {
    if (!this.statusSubmitting()) {
      this.statusTarget.set(null);
    }
  }

  protected confirmStatusChange(): void {
    const farm = this.statusTarget();

    if (!farm || this.statusSubmitting() || !this.canManageStatus(farm)) {
      return;
    }

    const nextStatus = this.statusConfirmation().nextStatus;
    this.statusSubmitting.set(true);

    this.farmService
      .updateStatus(farm.id, { status: nextStatus })
      .pipe(
        finalize(() => this.statusSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updatedFarm) => {
          this.selectedFarmStore.upsertFarm(updatedFarm);
          this.toastStore.success(
            nextStatus === 'ACTIVE' ? 'Fazenda ativada.' : 'Fazenda inativada.',
          );
          this.statusTarget.set(null);
          this.closeDrawer();
          this.loadPage(this.currentPage());
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  protected canEditFarm(farm: Farm): boolean {
    return (
      this.sessionStore.isAdmin() ||
      (this.hasSelectedFarmAccess(farm) && this.farmAccessStore.canEditFarm())
    );
  }

  protected canManageStatus(farm: Farm): boolean {
    return (
      this.sessionStore.isAdmin() ||
      (this.hasSelectedFarmAccess(farm) && this.farmAccessStore.canChangeFarmStatus())
    );
  }

  private hasSelectedFarmAccess(farm: Farm): boolean {
    return (
      this.selectedFarmStore.selectedFarmId() === farm.id &&
      this.farmAccessStore.access()?.farmId === farm.id &&
      !this.farmAccessStore.loading()
    );
  }

  private loadPage(page: number): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    this.farmService
      .list({ page, size: 10, sort: 'name', direction: 'ASC', ...this.activeFilters() })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.response.set(response),
        error: () => {
          this.response.set(null);
          this.error.set(true);
        },
      });
  }

  private activeFilters(): Pick<FarmListParams, 'search' | 'document' | 'productionType' | 'status'> {
    const filters = this.filters();

    return {
      ...(filters.search !== null ? { search: filters.search } : {}),
      ...(filters.document !== null ? { document: filters.document } : {}),
      ...(filters.productionType !== null ? { productionType: filters.productionType } : {}),
      ...(filters.status !== null ? { status: filters.status } : {}),
    };
  }

  private showOperationError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.toastStore.error('Não foi possível concluir a operação.');
      return;
    }

    const messages: Record<number, string> = {
      400: 'Verifique os dados informados.',
      401: 'Sua sessão expirou. Faça login novamente.',
      403: 'Você não tem permissão para realizar esta ação.',
      404: 'Fazenda não encontrada.',
    };

    this.toastStore.error(messages[error.status] ?? 'Não foi possível concluir a operação.');
  }
}
