import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { Subscription, finalize } from 'rxjs';

import {
  FinancialAgendaFilterStatus,
  FinancialAgendaFilterType,
  FinancialAgendaItem,
  FinancialAgendaSummary,
  FinancialAgendaSummaryGroup,
} from '../../core/models/financial-agenda.models';
import { HarvestSeason } from '../../core/models/harvest-season.models';
import { FinancialAgendaService } from '../../core/services/financial-agenda.service';
import { HarvestSeasonService } from '../../core/services/harvest-season.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { GdFormControl, GdFormValue, GdSelectOption, Select } from '../../shared/forms';
import { BrCurrencyPipe } from '../../shared/pipes/br-currency.pipe';
import { Badge, BadgeVariant, Button, EmptyState, ErrorState, Skeleton, SummaryCard, SummaryCardTone } from '../../shared/ui';

interface AgendaChip<T extends string | number> {
  label: string;
  value: T | null;
}

interface AgendaFilterControls {
  status: GdFormControl;
  type: GdFormControl;
}

interface SummaryCardViewModel {
  title: string;
  value: string;
  meta: string;
  description: string;
  icon: string;
  tone: SummaryCardTone;
}

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_PERIOD_DAYS = 30;

const EMPTY_SUMMARY: FinancialAgendaSummary = {
  farmId: 0,
  overdueReceivable: { count: 0, totalAmount: 0 },
  overduePayable: { count: 0, totalAmount: 0 },
  pendingReceivable: { count: 0, totalAmount: 0 },
  pendingPayable: { count: 0, totalAmount: 0 },
  openReceivable: { count: 0, totalAmount: 0 },
  openPayable: { count: 0, totalAmount: 0 },
};

@Component({
  selector: 'gd-upcoming-bills-page',
  imports: [
    Badge,
    Button,
    EmptyState,
    ErrorState,
    LucideDynamicIcon,
    Select,
    Skeleton,
    SummaryCard,
    BrCurrencyPipe,
  ],
  templateUrl: './upcoming-bills-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingBillsPage {
  private readonly agendaService = inject(FinancialAgendaService);
  private readonly harvestSeasonService = inject(HarvestSeasonService);

  protected readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly farmAccessStore = inject(FarmAccessStore);
  protected readonly sessionStore = inject(SessionStore);

  protected readonly summary = signal<FinancialAgendaSummary | null>(null);
  protected readonly items = signal<FinancialAgendaItem[]>([]);
  protected readonly harvestSeasons = signal<HarvestSeason[]>([]);
  protected readonly page = signal(0);
  protected readonly pageInfo = signal({ totalPages: 0, totalElements: 0, first: true, last: true });
  protected readonly loadingSummary = signal(false);
  protected readonly loadingItems = signal(false);
  protected readonly loadingHarvestSeasons = signal(false);
  protected readonly error = signal(false);
  protected readonly accessDenied = signal(false);
  protected readonly selectedStatus = signal<FinancialAgendaFilterStatus>('ALL');
  protected readonly selectedType = signal<FinancialAgendaFilterType>('ALL');
  protected readonly selectedPeriodDays = signal<number | null>(DEFAULT_PERIOD_DAYS);
  protected readonly selectedHarvestSeasonIds = signal<readonly number[]>([]);
  protected readonly reloadTrigger = signal(0);
  protected readonly summarySkeletons = [1, 2, 3, 4, 5, 6];
  protected readonly itemSkeletons = [1, 2, 3, 4, 5, 6];

  protected readonly filterForm = new FormGroup<AgendaFilterControls>({
    status: new FormControl<GdFormValue>('ALL'),
    type: new FormControl<GdFormValue>('ALL'),
  });

  private readonly currencyPipe = new BrCurrencyPipe();
  private readonly dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
  private lastFarmId: number | null = null;

  protected readonly selectedFarmName = computed(
    () => this.selectedFarmStore.selectedFarm()?.name ?? null,
  );
  protected readonly canViewAgenda = computed(() => {
    if (this.sessionStore.isAdmin()) {
      return true;
    }

    const farmId = this.selectedFarmStore.selectedFarmId();

    return (
      !!farmId &&
      this.farmAccessStore.access()?.farmId === farmId &&
      this.farmAccessStore.canViewFinancial()
    );
  });
  protected readonly summaryCards = computed<readonly SummaryCardViewModel[]>(() => {
    const summary = this.summary() ?? EMPTY_SUMMARY;

    return [
      this.summaryCard(
        'Vencidas a receber',
        summary.overdueReceivable,
        'Entradas que já venceram e ainda não foram recebidas.',
        'landmark',
        'info',
      ),
      this.summaryCard(
        'Vencidas a pagar',
        summary.overduePayable,
        'Despesas que já venceram e ainda não foram pagas.',
        'alert-circle',
        'danger',
      ),
      this.summaryCard(
        'Pendentes a receber',
        summary.pendingReceivable,
        'Entradas ainda não vencidas que estão previstas para recebimento.',
        'trending-up',
        'success',
      ),
      this.summaryCard(
        'Pendentes a pagar',
        summary.pendingPayable,
        'Despesas ainda não vencidas que precisam ser pagas.',
        'calendar-clock',
        'warning',
      ),
      this.summaryCard(
        'Total a receber',
        summary.openReceivable,
        'Total em aberto a receber, somando vencidas e pendentes.',
        'wallet',
        'success',
      ),
      this.summaryCard(
        'Total a pagar',
        summary.openPayable,
        'Total em aberto a pagar, somando vencidas e pendentes.',
        'trending-down',
        'danger',
      ),
    ];
  });
  protected readonly hasActiveFilters = computed(
    () =>
      this.selectedStatus() !== 'ALL' ||
      this.selectedType() !== 'ALL' ||
      this.selectedPeriodDays() !== DEFAULT_PERIOD_DAYS ||
      this.selectedHarvestSeasonIds().length > 0,
  );
  protected readonly harvestSeasonChips = computed<readonly AgendaChip<number>[]>(() => [
    { label: 'Todas', value: null },
    ...this.harvestSeasons().map((season) => ({
      label: this.harvestSeasonOptionLabel(season),
      value: season.id,
    })),
  ]);

  protected readonly statusOptions: readonly GdSelectOption[] = [
    { label: 'Todos', value: 'ALL' },
    { label: 'Pendentes', value: 'PENDING' },
    { label: 'Vencidos', value: 'OVERDUE' },
  ];
  protected readonly typeOptions: readonly GdSelectOption[] = [
    { label: 'Todos', value: 'ALL' },
    { label: 'A receber', value: 'RECEIVABLE' },
    { label: 'A pagar', value: 'PAYABLE' },
  ];
  protected readonly periodChips: readonly AgendaChip<number>[] = [
    { label: 'Todos', value: null },
    { label: '7 dias', value: 7 },
    { label: '15 dias', value: 15 },
    { label: '30 dias', value: 30 },
    { label: '60 dias', value: 60 },
    { label: '90 dias', value: 90 },
  ];

  constructor() {
    this.filterForm.controls.status.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.selectStatus(this.normalizeStatus(value)));

    this.filterForm.controls.type.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.selectType(this.normalizeType(value)));

    effect((onCleanup) => {
      const farmId = this.selectedFarmStore.selectedFarmId();

      this.harvestSeasons.set([]);

      if (!farmId) {
        this.loadingHarvestSeasons.set(false);
        return;
      }

      this.loadingHarvestSeasons.set(true);

      const subscription = this.harvestSeasonService
        .list({
          farmId,
          includeInactive: true,
          page: 0,
          size: 100,
          sort: 'startDate',
          direction: 'DESC',
        })
        .pipe(finalize(() => this.loadingHarvestSeasons.set(false)))
        .subscribe({
          next: (response) => this.harvestSeasons.set(response.content),
          error: () => this.harvestSeasons.set([]),
        });

      onCleanup(() => subscription.unsubscribe());
    });

    effect((onCleanup) => {
      const farmId = this.selectedFarmStore.selectedFarmId();
      const isAdmin = this.sessionStore.isAdmin();

      if (farmId !== this.lastFarmId) {
        untracked(() => {
          this.lastFarmId = farmId;
          this.selectedHarvestSeasonIds.set([]);
          this.page.set(0);
        });
      }

      const page = this.page();
      const status = this.selectedStatus();
      const type = this.selectedType();
      const periodDays = this.selectedPeriodDays();
      const harvestSeasonIds = [...this.selectedHarvestSeasonIds()];
      this.reloadTrigger();

      if (!farmId) {
        this.clearDataState();
        return;
      }

      if (!isAdmin && this.isAccessPending()) {
        this.clearDataState();
        return;
      }

      if (!isAdmin && !this.canViewAgenda()) {
        this.clearDataState();
        this.accessDenied.set(true);
        return;
      }

      this.accessDenied.set(false);
      this.error.set(false);
      this.loadAgenda({ farmId, status, type, periodDays, harvestSeasonIds, page }, onCleanup);
    });
  }

  protected retry(): void {
    this.reloadTrigger.update((value) => value + 1);
  }

  protected resetFilters(): void {
    this.selectedStatus.set('ALL');
    this.selectedType.set('ALL');
    this.selectedPeriodDays.set(DEFAULT_PERIOD_DAYS);
    this.selectedHarvestSeasonIds.set([]);
    this.filterForm.setValue({ status: 'ALL', type: 'ALL' }, { emitEvent: false });
    this.resetPage();
  }

  protected selectStatus(status: FinancialAgendaFilterStatus | null): void {
    const nextStatus = status ?? 'ALL';
    this.selectedStatus.set(nextStatus);
    if (this.filterForm.controls.status.value !== nextStatus) {
      this.filterForm.controls.status.setValue(nextStatus, { emitEvent: false });
    }
    this.resetPage();
  }

  protected selectType(type: FinancialAgendaFilterType | null): void {
    const nextType = type ?? 'ALL';
    this.selectedType.set(nextType);
    if (this.filterForm.controls.type.value !== nextType) {
      this.filterForm.controls.type.setValue(nextType, { emitEvent: false });
    }
    this.resetPage();
  }

  protected selectPeriod(periodDays: number | null): void {
    this.selectedPeriodDays.set(periodDays);
    this.resetPage();
  }

  protected selectHarvestSeason(harvestSeasonId: number | null): void {
    if (harvestSeasonId === null) {
      this.selectedHarvestSeasonIds.set([]);
      this.resetPage();
      return;
    }

    this.selectedHarvestSeasonIds.update((selected) =>
      selected.includes(harvestSeasonId)
        ? selected.filter((id) => id !== harvestSeasonId)
        : [...selected, harvestSeasonId],
    );
    this.resetPage();
  }

  protected previousPage(): void {
    if (!this.pageInfo().first) {
      this.page.update((value) => Math.max(value - 1, 0));
    }
  }

  protected nextPage(): void {
    if (!this.pageInfo().last) {
      this.page.update((value) => value + 1);
    }
  }

  protected chipClasses(active: boolean): string {
    return [
      'min-h-9 cursor-pointer rounded-full border px-3 text-sm font-medium shadow-sm transition-all duration-200 ease-out',
      'focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary',
      active
        ? 'border-primary bg-primary text-white hover:bg-primary-hover'
        : 'border-border bg-surface text-text-primary hover:border-primary/50 hover:text-primary',
    ].join(' ');
  }


  protected isPeriodSelected(periodDays: number | null): boolean {
    return periodDays === this.selectedPeriodDays();
  }

  protected isHarvestSeasonSelected(harvestSeasonId: number | null): boolean {
    return harvestSeasonId === null
      ? this.selectedHarvestSeasonIds().length === 0
      : this.selectedHarvestSeasonIds().includes(harvestSeasonId);
  }

  protected agendaTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      RECEIVABLE: 'A receber',
      PAYABLE: 'A pagar',
    };

    return labels[type] ?? type;
  }

  protected agendaTypeVariant(type: string): BadgeVariant {
    return type === 'RECEIVABLE' ? 'success' : type === 'PAYABLE' ? 'danger' : 'neutral';
  }

  protected agendaStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Pendente',
      OVERDUE: 'Vencido',
    };

    return labels[status] ?? status;
  }

  protected agendaStatusVariant(status: string): BadgeVariant {
    return status === 'OVERDUE' ? 'danger' : status === 'PENDING' ? 'warning' : 'neutral';
  }

  protected amountClasses(item: FinancialAgendaItem): string {
    return item.agendaType === 'RECEIVABLE' || item.transactionType === 'INCOME'
      ? 'text-success'
      : 'text-danger';
  }

  protected amountPrefix(item: FinancialAgendaItem): string {
    return item.agendaType === 'RECEIVABLE' || item.transactionType === 'INCOME' ? '+' : '-';
  }

  protected formatDate(value: string | null | undefined): string {
    return value ? this.dateFormatter.format(new Date(value)) : 'Não informado';
  }

  protected dueText(item: FinancialAgendaItem): string {
    if (item.agendaStatus === 'OVERDUE') {
      const days = item.daysOverdue ?? Math.abs(item.daysUntilDue ?? 0);
      if (days === 0) {
        return 'Vencido hoje';
      }

      return days === 1 ? 'Vencido há 1 dia' : `Vencido há ${days} dias`;
    }

    const days = item.daysUntilDue ?? 0;
    if (days === 0) {
      return 'Vence hoje';
    }

    return days === 1 ? 'Vence em 1 dia' : `Vence em ${days} dias`;
  }

  protected dueVariant(item: FinancialAgendaItem): BadgeVariant {
    if (item.agendaStatus === 'OVERDUE') {
      return 'danger';
    }

    const days = item.daysUntilDue ?? 0;
    return days <= 7 ? 'warning' : 'neutral';
  }

  private loadAgenda(
    params: {
      farmId: number;
      status: FinancialAgendaFilterStatus;
      type: FinancialAgendaFilterType;
      periodDays: number | null;
      harvestSeasonIds: number[];
      page: number;
    },
    onCleanup: (cleanupFn: () => void) => void,
  ): void {
    const subscriptions = new Subscription();
    const filters = {
      farmId: params.farmId,
      status: params.status,
      type: params.type,
      periodDays: params.periodDays,
      harvestSeasonIds: params.harvestSeasonIds,
    };

    this.summary.set(null);
    this.loadingSummary.set(true);
    subscriptions.add(
      this.agendaService
        .getSummary(filters)
        .pipe(finalize(() => this.loadingSummary.set(false)))
        .subscribe({
          next: (summary) => this.summary.set(summary),
          error: (error: unknown) => this.handleLoadError(error),
        }),
    );

    this.items.set([]);
    this.loadingItems.set(true);
    subscriptions.add(
      this.agendaService
        .getItems({ ...filters, page: params.page, size: DEFAULT_PAGE_SIZE })
        .pipe(finalize(() => this.loadingItems.set(false)))
        .subscribe({
          next: (response) => {
            this.items.set(response.content);
            this.pageInfo.set({
              totalPages: response.totalPages,
              totalElements: response.totalElements,
              first: response.first,
              last: response.last,
            });
          },
          error: (error: unknown) => this.handleLoadError(error),
        }),
    );

    onCleanup(() => subscriptions.unsubscribe());
  }

  private handleLoadError(error: unknown): void {
    this.summary.set(null);
    this.items.set([]);
    this.pageInfo.set({ totalPages: 0, totalElements: 0, first: true, last: true });

    if (error instanceof HttpErrorResponse && error.status === 403) {
      this.accessDenied.set(true);
      return;
    }

    this.error.set(true);
  }

  private clearDataState(): void {
    this.summary.set(null);
    this.items.set([]);
    this.pageInfo.set({ totalPages: 0, totalElements: 0, first: true, last: true });
    this.loadingSummary.set(false);
    this.loadingItems.set(false);
    this.error.set(false);
    this.accessDenied.set(false);
  }

  private isAccessPending(): boolean {
    return (
      this.farmAccessStore.loading() ||
      (!this.farmAccessStore.access() && !this.farmAccessStore.error())
    );
  }

  private resetPage(): void {
    if (this.page() !== 0) {
      this.page.set(0);
    }
  }

  private normalizeStatus(value: GdFormValue): FinancialAgendaFilterStatus {
    return value === 'PENDING' || value === 'OVERDUE' ? value : 'ALL';
  }

  private normalizeType(value: GdFormValue): FinancialAgendaFilterType {
    return value === 'RECEIVABLE' || value === 'PAYABLE' ? value : 'ALL';
  }

  private summaryCard(
    title: string,
    group: FinancialAgendaSummaryGroup,
    description: string,
    icon: string,
    tone: SummaryCardTone,
  ): SummaryCardViewModel {
    return {
      title,
      value: this.formatCurrency(group.totalAmount),
      meta: this.countLabel(group.count),
      description,
      icon,
      tone,
    };
  }

  private formatCurrency(value: number): string {
    return this.currencyPipe.transform(value) ?? 'R$ 0,00';
  }

  private countLabel(count: number): string {
    return count === 1 ? '1 conta' : `${count} contas`;
  }

  private harvestSeasonOptionLabel(season: HarvestSeason): string {
    return season.productionActivityName ? `${season.name} · ${season.productionActivityName}` : season.name;
  }
}
