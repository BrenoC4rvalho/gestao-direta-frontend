import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
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
import { Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { finalize } from 'rxjs';

import {
  HarvestSeasonStatus,
  HarvestSeasonSummaryListItem,
  HarvestSeasonSummaryListParams,
  UpdateHarvestSeasonRequest,
} from '../../core/models/harvest-season.models';
import { PageResponse } from '../../core/models/page-response.model';
import { ProductionActivity } from '../../core/models/production-activity.models';
import { HarvestSeasonService } from '../../core/services/harvest-season.service';
import { ProductionActivityService } from '../../core/services/production-activity.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { GdFormControl, GdFormValue, GdSelectOption, Input, Select, Textarea } from '../../shared/forms';
import { Drawer } from '../../shared/overlays';
import { BrCurrencyPipe } from '../../shared/pipes/br-currency.pipe';
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
import {
  brazilianMoneyToNumber,
  numberToBrazilianMoney,
  sanitizeBrazilianMoneyInput,
} from '../../shared/utils/money.utils';

const DEFAULT_PAGE_SIZE = 10;

interface HarvestFormControls {
  productionActivityId: GdFormControl;
  name: GdFormControl;
  description: GdFormControl;
  startDate: GdFormControl;
  endDate: GdFormControl;
  expectedCost: GdFormControl;
  expectedRevenue: GdFormControl;
  areaHectares: GdFormControl;
  status: GdFormControl;
}

interface HarvestSummaryCard {
  label: string;
  value: string | number;
  subtext: string;
  icon: string;
  tone: 'primary' | 'success' | 'info' | 'warning';
  currency: boolean;
}

@Component({
  selector: 'gd-harvests-page',
  imports: [
    Badge,
    BrCurrencyPipe,
    Button,
    Card,
    Drawer,
    EmptyState,
    ErrorState,
    Input,
    ListFilters,
    LucideDynamicIcon,
    ReactiveFormsModule,
    Select,
    Skeleton,
    Textarea,
  ],
  templateUrl: './harvests-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HarvestsPage {
  private readonly harvestService = inject(HarvestSeasonService);
  private readonly productionActivityService = inject(ProductionActivityService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastStore = inject(ToastStore);
  private readonly router = inject(Router);

  protected readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly farmAccessStore = inject(FarmAccessStore);
  protected readonly sessionStore = inject(SessionStore);

  private readonly searchTerm = signal('');
  private readonly selectedStatuses = signal<HarvestSeasonStatus[]>([]);
  private readonly selectedProductionActivityIds = signal<number[]>([]);
  private readonly periodStart = signal('');
  private readonly periodEnd = signal('');
  private readonly periodError = signal<string | null>(null);
  private readonly reloadTrigger = signal(0);
  private currentFarmId: number | null = null;

  protected readonly response = signal<PageResponse<HarvestSeasonSummaryListItem> | null>(null);
  protected readonly productionActivities = signal<ProductionActivity[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly accessDenied = signal(false);
  protected readonly drawerOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly skeletons = [1, 2, 3, 4];
  protected readonly filtersConfig = computed<ListFiltersConfig>(() => ({
    subtitle: 'Busque e filtre safras da fazenda selecionada.',
    search: { placeholder: 'Buscar por nome ou atividade' },
    textFields: [
      {
        key: 'periodStart',
        label: 'Inicio do periodo',
        type: 'date',
        error: this.periodError(),
      },
      {
        key: 'periodEnd',
        label: 'Fim do periodo',
        type: 'date',
      },
    ],
    quickFilters: [
      {
        key: 'status',
        label: 'Status',
        multiple: true,
        options: [
          { label: 'Todas', value: null },
          { label: 'Planejadas', value: 'PLANNED' },
          { label: 'Em andamento', value: 'IN_PROGRESS' },
          { label: 'Encerradas', value: 'FINISHED' },
          { label: 'Inativas', value: 'INACTIVE' },
        ],
      },
      {
        key: 'productionActivity',
        label: 'Atividade produtiva',
        multiple: true,
        emptyMessage: 'Nenhuma atividade produtiva disponivel.',
        options: this.productionActivities().length > 0
          ? [
              { label: 'Todas', value: null },
              ...this.productionActivities().map((activity) => ({
                label: activity.name,
                value: String(activity.id),
              })),
            ]
          : [],
      },
    ],
  }));
  protected readonly statusOptions: readonly GdSelectOption[] = [
    { label: 'Planejada', value: 'PLANNED' },
    { label: 'Em andamento', value: 'IN_PROGRESS' },
    { label: 'Encerrada', value: 'FINISHED' },
    { label: 'Inativa', value: 'INACTIVE' },
  ];

  protected readonly form = new FormGroup<HarvestFormControls>(
    {
      productionActivityId: new FormControl<GdFormValue>('', { validators: [Validators.required] }),
      name: new FormControl<GdFormValue>('', { validators: [Validators.required] }),
      description: new FormControl<GdFormValue>(''),
      startDate: new FormControl<GdFormValue>('', { validators: [Validators.required] }),
      endDate: new FormControl<GdFormValue>(''),
      expectedCost: new FormControl<GdFormValue>(''),
      expectedRevenue: new FormControl<GdFormValue>(''),
      areaHectares: new FormControl<GdFormValue>(''),
      status: new FormControl<GdFormValue>('PLANNED', { validators: [Validators.required] }),
    },
    { validators: [this.dateRangeValidator()] },
  );

  protected readonly activityOptions = computed<readonly GdSelectOption[]>(() =>
    this.productionActivities()
      .filter((activity) => activity.status === 'ACTIVE')
      .map((activity) => ({ label: activity.name, value: activity.id })),
  );
  protected readonly harvests = computed(() => this.response()?.content ?? []);
  protected readonly currentPage = computed(() => this.response()?.page ?? 0);
  protected readonly hasActiveFilters = computed(
    () => this.selectedStatuses().length > 0 ||
      this.selectedProductionActivityIds().length > 0 ||
      this.searchTerm().length > 0 ||
      this.periodStart().length > 0 ||
      this.periodEnd().length > 0,
  );
  protected readonly canManageHarvests = computed(() => {
    if (this.sessionStore.isAdmin()) {
      return true;
    }

    const farmId = this.selectedFarmStore.selectedFarmId();

    // TODO: trocar por permissao especifica de safra quando o backend expuser.
    return !!farmId && this.farmAccessStore.access()?.farmId === farmId && this.farmAccessStore.role() === 'PRODUCER';
  });
  protected readonly canViewHarvests = computed(() => {
    if (this.sessionStore.isAdmin()) {
      return true;
    }

    const farmId = this.selectedFarmStore.selectedFarmId();
    const role = this.farmAccessStore.role();

    return (
      !!farmId &&
      this.farmAccessStore.access()?.farmId === farmId &&
      (role === 'PRODUCER' || role === 'EMPLOYEE' || role === 'ACCOUNTANT')
    );
  });
  protected readonly emptyStateTitle = computed(() =>
    this.hasActiveFilters() ? 'Nenhuma safra encontrada para os filtros informados.' : 'Nenhuma safra cadastrada.',
  );
  protected readonly emptyStateDescription = computed(() =>
    this.hasActiveFilters()
      ? 'Ajuste a busca ou o filtro de status.'
      : 'Crie uma safra para acompanhar custos, receitas e períodos produtivos.',
  );
  protected readonly summaryCards = computed<readonly HarvestSummaryCard[]>(() => {
    const harvests = this.response()?.content ?? [];
    const activeSeasons = harvests.filter(
      (harvest) => harvest.status === 'PLANNED' || harvest.status === 'IN_PROGRESS',
    ).length;
    const realizedCost = harvests.reduce((total, harvest) => total + (harvest.realizedCost ?? 0), 0);
    const realizedRevenue = harvests.reduce((total, harvest) => total + (harvest.realizedRevenue ?? 0), 0);
    const realizedProfit = harvests.reduce((total, harvest) => total + (harvest.realizedProfit ?? 0), 0);

    return [
      {
        label: 'Safras ativas',
        value: activeSeasons,
        subtext: 'Planejadas e em andamento',
        icon: 'sprout',
        tone: 'primary',
        currency: false,
      },
      {
        label: 'Custo realizado',
        value: realizedCost,
        subtext: 'Despesas pagas nas safras',
        icon: 'briefcase-business',
        tone: 'warning',
        currency: true,
      },
      {
        label: 'Receita realizada',
        value: realizedRevenue,
        subtext: 'Receitas pagas nas safras',
        icon: 'trending-up',
        tone: 'success',
        currency: true,
      },
      {
        label: 'Lucro realizado',
        value: realizedProfit,
        subtext: 'Receita realizada menos custo',
        icon: 'chart-no-axes-combined',
        tone: 'info',
        currency: true,
      },
    ];
  });
  protected readonly drawerTitle = 'Nova safra';
  protected readonly drawerDescription = 'Cadastre uma safra vinculada à fazenda selecionada.';

  constructor() {
    this.bindMoneySanitizer(this.form.controls.expectedCost);
    this.bindMoneySanitizer(this.form.controls.expectedRevenue);

    effect((onCleanup) => {
      const farmId = this.selectedFarmStore.selectedFarmId();
      const isAdmin = this.sessionStore.isAdmin();
      this.reloadTrigger();

      if (this.currentFarmId !== farmId) {
        this.currentFarmId = farmId;
        this.resetFiltersForFarmChange();
        if (farmId) {
          this.loadProductionActivities(farmId);
        } else {
          this.productionActivities.set([]);
        }
      }

      if (!farmId) {
        this.clearListState();
        return;
      }

      if (!isAdmin && this.isAccessPending()) {
        this.clearListState();
        return;
      }

      if (!this.canViewHarvests()) {
        this.clearListState();
        this.accessDenied.set(true);
        return;
      }

      if (!this.isPeriodRangeValid()) {
        this.periodError.set('A data inicial não pode ser posterior à data final.');
        return;
      }

      this.periodError.set(null);
      this.accessDenied.set(false);
      this.error.set(false);
      this.loading.set(true);

      const subscription = this.harvestService
        .listSummary(this.listParams(farmId, 0, DEFAULT_PAGE_SIZE))
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
    const periodStart = this.firstFilterValue(filters['periodStart']) ?? '';
    const periodEnd = this.firstFilterValue(filters['periodEnd']) ?? '';

    this.searchTerm.set(this.firstFilterValue(filters['search']) ?? '');
    this.selectedStatuses.set(this.filterStatusValues(filters['status']));
    this.selectedProductionActivityIds.set(this.filterNumberValues(filters['productionActivity']));
    this.periodStart.set(periodStart);
    this.periodEnd.set(periodEnd);
    this.periodError.set(
      this.isPeriodRangeValid(periodStart, periodEnd)
        ? null
        : 'A data inicial não pode ser posterior à data final.',
    );
  }

  private firstFilterValue(value: string | string[] | null | undefined): string | null {
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
  }

  private filterStatusValues(value: string | string[] | null | undefined): HarvestSeasonStatus[] {
    return this.filterStringValues(value) as HarvestSeasonStatus[];
  }

  private filterNumberValues(value: string | string[] | null | undefined): number[] {
    return this.filterStringValues(value)
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));
  }

  private filterStringValues(value: string | string[] | null | undefined): string[] {
    if (Array.isArray(value)) {
      return value;
    }

    return value ? [value] : [];
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

  protected goToDetails(id: number): void {
    void this.router.navigate(['/harvests', id]);
  }

  protected handleCardKeydown(event: KeyboardEvent, id: number): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.goToDetails(id);
  }

  protected openCreateDrawer(): void {
    if (!this.canManageHarvests()) {
      this.showPermissionError();
      return;
    }

    this.form.reset({
      productionActivityId: '',
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      expectedCost: '',
      expectedRevenue: '',
      areaHectares: '',
      status: 'PLANNED',
    });
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    if (!this.submitting()) {
      this.drawerOpen.set(false);
    }
  }

  protected saveHarvest(): void {
    if (!this.canManageHarvests()) {
      this.showPermissionError();
      return;
    }

    this.applyNumericValidation();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const farmId = this.selectedFarmStore.selectedFarmId();
    const productionActivityId = this.numberValue(this.form.controls.productionActivityId.value);
    const name = this.stringValue(this.form.controls.name.value);
    const startDate = this.stringValue(this.form.controls.startDate.value);

    if (!farmId || productionActivityId === null || !name || !startDate) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildSavePayload(productionActivityId, name, startDate);

    this.submitting.set(true);

    this.harvestService
      .create({ farmId, ...payload })
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.drawerOpen.set(false);
          this.toastStore.success('Safra criada com sucesso.');
          this.retry();
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  protected statusLabel(status: HarvestSeasonStatus): string {
    const labels: Record<HarvestSeasonStatus, string> = {
      PLANNED: 'Planejada',
      IN_PROGRESS: 'Em andamento',
      FINISHED: 'Encerrada',
      INACTIVE: 'Inativa',
    };

    return labels[status];
  }

  protected statusVariant(status: HarvestSeasonStatus): BadgeVariant {
    const variants: Record<HarvestSeasonStatus, BadgeVariant> = {
      PLANNED: 'warning',
      IN_PROGRESS: 'success',
      FINISHED: 'neutral',
      INACTIVE: 'danger',
    };

    return variants[status];
  }

  protected summaryToneClasses(tone: HarvestSummaryCard['tone']): string {
    const tones: Record<HarvestSummaryCard['tone'], string> = {
      primary: 'bg-highlight-soft text-primary',
      success: 'bg-success/10 text-success',
      info: 'bg-info/10 text-info',
      warning: 'bg-warning/10 text-amber-700 dark:text-amber-300',
    };

    return tones[tone];
  }

  protected periodLabel(harvest: HarvestSeasonSummaryListItem): string {
    if (!harvest.startDate) {
      return 'Sem periodo definido';
    }

    const endDate = harvest.endDate ? this.formatDate(harvest.endDate) : 'Sem data final';

    return `${this.formatDate(harvest.startDate)} a ${endDate}`;
  }

  protected estimatedProfit(harvest: HarvestSeasonSummaryListItem): number {
    return harvest.expectedProfit ?? (harvest.expectedRevenue ?? 0) - (harvest.expectedCost ?? 0);
  }

  protected realizedProfitClass(harvest: HarvestSeasonSummaryListItem): string {
    return (harvest.realizedProfit ?? 0) < 0 ? 'text-danger' : 'text-success';
  }

  protected areaLabel(harvest: HarvestSeasonSummaryListItem): string {
    return harvest.areaHectares === null || harvest.areaHectares === undefined ? '—' : `${harvest.areaHectares} ha`;
  }

  protected formatDate(date: string): string {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(date));
  }

  protected fieldError(controlName: keyof HarvestFormControls): string | null {
    const control = this.form.controls[controlName];

    if (control.hasError('required')) {
      return 'Campo obrigatorio.';
    }

    if (control.hasError('nonNegative')) {
      return 'Informe um valor maior ou igual a zero.';
    }

    if (controlName === 'endDate' && this.form.hasError('dateRange')) {
      return 'A data final deve ser igual ou posterior a data inicial.';
    }

    return null;
  }

  private loadPage(page: number): void {
    const farmId = this.selectedFarmStore.selectedFarmId();

    if (!farmId || this.loading() || !this.canViewHarvests() || !this.isPeriodRangeValid()) {
      return;
    }

    this.error.set(false);
    this.loading.set(true);

    this.harvestService
      .listSummary(this.listParams(farmId, page, this.response()?.size ?? DEFAULT_PAGE_SIZE))
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.response.set(response),
        error: (error: unknown) => this.handleListError(error),
      });
  }

  private listParams(farmId: number, page: number, size: number): HarvestSeasonSummaryListParams {
    return {
      farmId,
      search: this.searchTerm(),
      statuses: this.selectedStatuses(),
      productionActivityIds: this.selectedProductionActivityIds(),
      periodStart: this.periodStart(),
      periodEnd: this.periodEnd(),
      page,
      size,
      sort: 'startDate',
      direction: 'DESC',
    };
  }

  private buildSavePayload(
    productionActivityId: number,
    name: string,
    startDate: string,
  ): UpdateHarvestSeasonRequest {
    return {
      productionActivityId,
      name,
      description: this.stringValue(this.form.controls.description.value) || null,
      startDate,
      endDate: this.stringValue(this.form.controls.endDate.value) || null,
      expectedCost: this.moneyValue(this.form.controls.expectedCost.value),
      expectedRevenue: this.moneyValue(this.form.controls.expectedRevenue.value),
      areaHectares: this.numberValue(this.form.controls.areaHectares.value),
    };
  }

  private handleListError(error: unknown): void {
    this.response.set(null);
    if (error instanceof HttpErrorResponse && error.status === 403) {
      this.accessDenied.set(true);
      return;
    }

    this.error.set(true);
  }

  private showOperationError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.toastStore.error('Nao foi possivel concluir a operacao.');
      return;
    }

    const messages: Record<number, string> = {
      400: 'Verifique os dados da safra.',
      401: 'Sua sessao expirou. Faca login novamente.',
      403: 'Voce nao tem permissao para realizar esta acao.',
      404: 'Safra nao encontrada.',
    };

    this.toastStore.error(messages[error.status] ?? 'Nao foi possivel concluir a operacao.');
  }

  private showPermissionError(): void {
    this.toastStore.error('Voce nao tem permissao para gerenciar safras.');
  }

  private clearListState(): void {
    this.response.set(null);
    this.error.set(false);
    this.accessDenied.set(false);
    this.loading.set(false);
  }

  private resetFiltersForFarmChange(): void {
    this.searchTerm.set('');
    this.selectedStatuses.set([]);
    this.selectedProductionActivityIds.set([]);
    this.periodStart.set('');
    this.periodEnd.set('');
    this.periodError.set(null);
    this.response.set(null);
  }

  private loadProductionActivities(farmId: number): void {
    this.productionActivityService
      .list({
        farmId,
        includeInactive: true,
        page: 0,
        size: 100,
        sort: 'name',
        direction: 'ASC',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.productionActivities.set(response.content),
        error: () => {
          this.productionActivities.set([]);
          this.toastStore.error('Não foi possível carregar as atividades produtivas.');
        },
      });
  }

  private isPeriodRangeValid(
    periodStart = this.periodStart(),
    periodEnd = this.periodEnd(),
  ): boolean {
    return !periodStart || !periodEnd || periodStart <= periodEnd;
  }

  private isAccessPending(): boolean {
    return this.farmAccessStore.loading() || (!this.farmAccessStore.access() && !this.farmAccessStore.error());
  }

  private bindMoneySanitizer(control: GdFormControl): void {
    control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      const sanitized = sanitizeBrazilianMoneyInput(`${value ?? ''}`);

      if (sanitized !== value) {
        control.setValue(sanitized, { emitEvent: false });
      }
    });
  }

  private applyNumericValidation(): void {
    this.validateNonNegativeMoney(this.form.controls.expectedCost);
    this.validateNonNegativeMoney(this.form.controls.expectedRevenue);
    this.validateNonNegativeNumber(this.form.controls.areaHectares);
  }

  private validateNonNegativeMoney(control: GdFormControl): void {
    const value = this.moneyValue(control.value);
    this.setControlError(control, 'nonNegative', value !== null && value < 0);
  }

  private validateNonNegativeNumber(control: GdFormControl): void {
    const value = this.numberValue(control.value);
    this.setControlError(control, 'nonNegative', value !== null && value < 0);
  }

  private setControlError(control: GdFormControl, errorName: string, shouldSet: boolean): void {
    const errors = { ...(control.errors ?? {}) };

    if (shouldSet) {
      errors[errorName] = true;
      control.setErrors(errors);
      return;
    }

    delete errors[errorName];
    control.setErrors(Object.keys(errors).length > 0 ? errors : null);
  }

  private dateRangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const startDate = `${control.get('startDate')?.value ?? ''}`;
      const endDate = `${control.get('endDate')?.value ?? ''}`;

      if (!startDate || !endDate) {
        return null;
      }

      return endDate >= startDate ? null : { dateRange: true };
    };
  }

  private moneyValue(value: GdFormValue): number | null {
    if (typeof value === 'boolean') {
      return null;
    }

    return brazilianMoneyToNumber(value);
  }

  private numberValue(value: GdFormValue): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = typeof value === 'number' ? value : Number(`${value}`.replace(',', '.'));

    return Number.isFinite(parsed) ? parsed : null;
  }

  private stringValue(value: GdFormValue): string {
    return `${value ?? ''}`.trim();
  }

}
