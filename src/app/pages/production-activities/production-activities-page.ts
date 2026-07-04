import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { finalize, Observable } from 'rxjs';

import { PageResponse } from '../../core/models/page-response.model';
import {
  CreateProductionActivityRequest,
  ProductionActivity,
  ProductionActivityListParams,
  ProductionActivityStatus,
  UpdateProductionActivityRequest,
} from '../../core/models/production-activity.models';
import { ProductionActivityService } from '../../core/services/production-activity.service';
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
} from '../../shared/ui';

type ProductionActivityStatusFilter = ProductionActivityStatus | null;
type DrawerMode = 'create' | 'edit';

interface ProductionActivityFormControls {
  name: GdFormControl;
  description: GdFormControl;
}

interface SummaryCard {
  label: string;
  value: string | number;
  subtext: string;
  icon: string;
  tone: 'primary' | 'success' | 'danger' | 'info';
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
    Skeleton,
    Textarea,
  ],
  templateUrl: './production-activities-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionActivitiesPage implements OnInit {
  private readonly activityService = inject(ProductionActivityService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastStore = inject(ToastStore);
  protected readonly sessionStore = inject(SessionStore);

  private readonly searchTerm = signal('');
  private readonly selectedStatus = signal<ProductionActivityStatusFilter>(null);

  protected readonly response = signal<PageResponse<ProductionActivity> | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly drawerOpen = signal(false);
  protected readonly drawerState = signal<DrawerState>({ mode: 'create', activity: null });
  protected readonly submitting = signal(false);
  protected readonly statusTarget = signal<ProductionActivity | null>(null);
  protected readonly statusSubmitting = signal(false);
  protected readonly skeletons = [1, 2, 3, 4, 5];
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

    // TODO: enviar search para o backend quando o endpoint documentar esse filtro.
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

  protected readonly summaryCards = computed<readonly SummaryCard[]>(() => {
    const response = this.response();
    const activities = response?.content ?? [];
    const active = activities.filter((activity) => activity.status === 'ACTIVE').length;
    const inactive = activities.filter((activity) => activity.status === 'INACTIVE').length;

    return [
      {
        label: 'Total de atividades',
        value: response?.totalElements ?? 0,
        subtext: 'Cadastros disponíveis',
        icon: 'sprout',
        tone: 'primary',
      },
      {
        label: 'Ativas',
        value: active,
        subtext: 'Disponíveis para novas safras',
        icon: 'circle-check',
        tone: 'success',
      },
      {
        label: 'Inativas',
        value: inactive,
        subtext: 'Ocultas em novos cadastros',
        icon: 'circle-off',
        tone: 'danger',
      },
      {
        label: 'Mais usadas',
        value: 'Em breve',
        subtext: 'Uso em safras será exibido futuramente',
        icon: 'trending-up',
        tone: 'info',
      },
    ];
  });

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

  ngOnInit(): void {
    if (this.sessionStore.isAdmin()) {
      this.loadPage(0);
    }
  }

  protected retry(): void {
    this.loadPage(this.currentPage());
  }

  protected changeFilters(filters: ListFilterValues): void {
    const status = this.firstFilterValue(filters['status']) as ProductionActivityStatusFilter;

    this.searchTerm.set(this.firstFilterValue(filters['search']) ?? '');
    this.selectedStatus.set(status);
    this.loadPage(0);
  }

  private firstFilterValue(value: string | string[] | null | undefined): string | null {
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
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
    this.drawerState.set({ mode: 'create', activity: null });
    this.form.reset({ name: '', description: '' });
    this.drawerOpen.set(true);
  }

  protected openEditDrawer(activity: ProductionActivity): void {
    this.drawerState.set({ mode: 'edit', activity });
    this.form.reset({
      name: activity.name,
      description: activity.description ?? '',
    });
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    if (!this.submitting()) {
      this.drawerOpen.set(false);
    }
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

    const payload: CreateProductionActivityRequest | UpdateProductionActivityRequest = {
      name,
      description: description || null,
    };
    const state = this.drawerState();

    this.submitting.set(true);

    const request$ =
      state.mode === 'edit' && state.activity
        ? this.activityService.update(state.activity.id, payload)
        : this.activityService.create(payload);

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
    const request$: Observable<unknown> = activating
      ? this.activityService.activate(target.id)
      : this.activityService.inactivate(target.id);

    request$
      .pipe(
        finalize(() => this.statusSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.statusTarget.set(null);
          this.toastStore.success(
            activating
              ? 'Atividade produtiva ativada com sucesso.'
              : 'Atividade produtiva inativada com sucesso.',
          );
          this.loadPage(this.currentPage());
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  protected statusLabel(status: ProductionActivityStatus): string {
    const labels: Record<ProductionActivityStatus, string> = {
      ACTIVE: 'Ativa',
      INACTIVE: 'Inativa',
    };

    return labels[status];
  }

  protected statusVariant(status: ProductionActivityStatus): BadgeVariant {
    return status === 'ACTIVE' ? 'success' : 'danger';
  }

  protected nextStatusActionLabel(activity: ProductionActivity): string {
    return activity.status === 'ACTIVE' ? 'Inativar' : 'Ativar';
  }

  protected summaryToneClasses(tone: SummaryCard['tone']): string {
    const tones: Record<SummaryCard['tone'], string> = {
      primary: 'bg-highlight-soft text-primary',
      success: 'bg-success/10 text-success',
      danger: 'bg-danger/10 text-danger',
      info: 'bg-info/10 text-info',
    };

    return tones[tone];
  }

  protected nameErrorMessage(): string | null {
    return this.form.controls.name.hasError('required')
      ? 'Informe o nome da atividade produtiva.'
      : null;
  }

  private loadPage(page: number): void {
    if (!this.sessionStore.isAdmin() || this.loading()) {
      return;
    }

    const params: ProductionActivityListParams = {
      page,
      size: this.response()?.size ?? 10,
      sort: 'name',
      direction: 'ASC',
      status: this.selectedStatus(),
    };

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
