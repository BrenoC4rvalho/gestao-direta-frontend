import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import { GdFormControl, Input } from '../../shared/forms';
import { ConfirmDialog, ConfirmDialogVariant, Drawer } from '../../shared/overlays';
import { Badge, BadgeVariant, Button, Card, ErrorState } from '../../shared/ui';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import {
  PRODUCTION_ACTIVITY_STATUS_LABELS,
  PRODUCTION_ACTIVITY_TYPE_LABELS,
  ProductionActivityListItem,
  ProductionActivityStatus,
  ProductionActivityType,
  productionActivitiesMock,
} from './production-activities.mock';

type ProductionActivityStatusFilter = 'ALL' | ProductionActivityStatus;
type DrawerMode = 'create' | 'view' | 'edit';

interface StatusFilterOption {
  label: string;
  value: ProductionActivityStatusFilter;
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
  activity: ProductionActivityListItem | null;
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
    ErrorState,
    Input,
    LucideDynamicIcon,
    ReactiveFormsModule,
  ],
  templateUrl: './production-activities-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionActivitiesPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastStore = inject(ToastStore);
  protected readonly sessionStore = inject(SessionStore);

  private readonly searchTerm = signal('');
  private readonly selectedStatus = signal<ProductionActivityStatusFilter>('ALL');

  protected readonly searchControl: GdFormControl = new FormControl('');
  protected readonly activities = signal<ProductionActivityListItem[]>([...productionActivitiesMock]);
  protected readonly drawerOpen = signal(false);
  protected readonly drawerState = signal<DrawerState>({ mode: 'create', activity: null });
  protected readonly statusTarget = signal<ProductionActivityListItem | null>(null);
  protected readonly statusFilters: readonly StatusFilterOption[] = [
    { label: 'Todas', value: 'ALL' },
    { label: 'Ativas', value: 'ACTIVE' },
    { label: 'Inativas', value: 'INACTIVE' },
  ];

  protected readonly summaryCards = computed<readonly SummaryCard[]>(() => {
    const activities = this.activities();
    const active = activities.filter((activity) => activity.status === 'ACTIVE').length;
    const mostUsed = activities.reduce((current, activity) =>
      activity.seasonsCount > current.seasonsCount ? activity : current,
    );

    return [
      {
        label: 'Total de atividades',
        value: activities.length,
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
        value: activities.length - active,
        subtext: 'Ocultas em novos cadastros',
        icon: 'circle-off',
        tone: 'danger',
      },
      {
        label: 'Mais usadas',
        value: mostUsed.name,
        subtext: 'Atividade com mais safras',
        icon: 'trending-up',
        tone: 'info',
      },
    ];
  });

  protected readonly filteredActivities = computed(() => {
    const search = this.normalizeText(this.searchTerm());
    const status = this.selectedStatus();

    return this.activities().filter((activity) => {
      const matchesSearch =
        !search ||
        this.normalizeText(activity.name).includes(search) ||
        this.normalizeText(activity.description).includes(search);
      const matchesStatus = status === 'ALL' || activity.status === status;

      return matchesSearch && matchesStatus;
    });
  });

  protected readonly drawerTitle = computed(() => {
    const state = this.drawerState();

    if (state.mode === 'create') {
      return 'Nova atividade produtiva';
    }

    if (state.mode === 'edit') {
      return 'Editar atividade produtiva';
    }

    return 'Atividade produtiva';
  });

  protected readonly drawerDescription = computed(() =>
    this.drawerState().mode === 'view'
      ? 'Visualização mockada da atividade produtiva.'
      : 'Cadastro será integrado ao backend em uma etapa futura.',
  );

  protected readonly drawerActivity = computed(() => this.drawerState().activity);
  protected readonly showSaveAction = computed(() => this.drawerState().mode !== 'view');
  protected readonly statusConfirmation = computed<StatusConfirmation>(() => {
    const target = this.statusTarget();
    const activating = target?.status === 'INACTIVE';

    return activating
      ? {
          title: 'Ativar atividade produtiva',
          description: 'Esta atividade voltará a ficar disponível para novas safras neste mock local.',
          confirmLabel: 'Ativar',
          variant: 'success',
        }
      : {
          title: 'Inativar atividade produtiva',
          description: 'Esta atividade será ocultada de novos cadastros neste mock local.',
          confirmLabel: 'Inativar',
          variant: 'warning',
        };
  });

  constructor() {
    this.searchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.searchTerm.set(String(value ?? '').trim()));
  }

  protected selectStatus(status: ProductionActivityStatusFilter): void {
    this.selectedStatus.set(status);
  }

  protected isSelectedStatus(status: ProductionActivityStatusFilter): boolean {
    return this.selectedStatus() === status;
  }

  protected openCreateDrawer(): void {
    this.drawerState.set({ mode: 'create', activity: null });
    this.drawerOpen.set(true);
  }

  protected openViewDrawer(activity: ProductionActivityListItem): void {
    this.drawerState.set({ mode: 'view', activity });
    this.drawerOpen.set(true);
  }

  protected openEditDrawer(activity: ProductionActivityListItem): void {
    this.drawerState.set({ mode: 'edit', activity });
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  protected savePlaceholder(): void {
    this.toastStore.info('Cadastro será integrado ao backend em breve.');
    this.closeDrawer();
  }

  protected requestStatusToggle(activity: ProductionActivityListItem): void {
    this.statusTarget.set(activity);
  }

  protected closeStatusConfirmation(): void {
    this.statusTarget.set(null);
  }

  protected confirmStatusToggle(): void {
    const target = this.statusTarget();

    if (!target) {
      return;
    }

    const nextStatus: ProductionActivityStatus = target.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.activities.update((activities) =>
      activities.map((activity) =>
        activity.id === target.id ? { ...activity, status: nextStatus } : activity,
      ),
    );
    this.statusTarget.set(null);
    this.toastStore.success(
      nextStatus === 'ACTIVE'
        ? 'Atividade produtiva ativada no mock local.'
        : 'Atividade produtiva inativada no mock local.',
    );
  }

  protected typeLabel(type: ProductionActivityType): string {
    return PRODUCTION_ACTIVITY_TYPE_LABELS[type];
  }

  protected typeVariant(type: ProductionActivityType): BadgeVariant {
    const variants: Record<ProductionActivityType, BadgeVariant> = {
      AGRICULTURE: 'success',
      LIVESTOCK: 'warning',
      MIXED: 'info',
      OTHER: 'neutral',
    };

    return variants[type];
  }

  protected statusLabel(status: ProductionActivityStatus): string {
    return PRODUCTION_ACTIVITY_STATUS_LABELS[status];
  }

  protected statusVariant(status: ProductionActivityStatus): BadgeVariant {
    return status === 'ACTIVE' ? 'success' : 'danger';
  }

  protected usageLabel(activity: ProductionActivityListItem): string {
    return activity.seasonsCount === 1 ? '1 safra' : activity.seasonsCount + ' safras';
  }

  protected nextStatusActionLabel(activity: ProductionActivityListItem): string {
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

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
