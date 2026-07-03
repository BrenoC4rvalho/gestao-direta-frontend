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
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { concatMap, finalize, forkJoin, of } from 'rxjs';

import {
  HarvestSeason,
  HarvestSeasonStatus,
  HarvestSeasonSummary,
  UpdateHarvestSeasonRequest,
} from '../../core/models/harvest-season.models';
import { FinancialTransaction, PaymentStatus } from '../../core/models/financial-transaction.models';
import { PageResponse } from '../../core/models/page-response.model';
import { ProductionActivity } from '../../core/models/production-activity.models';
import { FinancialTransactionService } from '../../core/services/financial-transaction.service';
import { HarvestSeasonService } from '../../core/services/harvest-season.service';
import { ProductionActivityService } from '../../core/services/production-activity.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { GdFormControl, GdFormValue, GdSelectOption, Input, Select, Textarea } from '../../shared/forms';
import { ConfirmDialog, Drawer } from '../../shared/overlays';
import { BrCurrencyPipe } from '../../shared/pipes/br-currency.pipe';
import { Badge, BadgeVariant, Button, Card, EmptyState, ErrorState, Skeleton } from '../../shared/ui';
import {
  brazilianMoneyToNumber,
  numberToBrazilianMoney,
  sanitizeBrazilianMoneyInput,
} from '../../shared/utils/money.utils';

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

interface SummaryCard {
  label: string;
  value: number;
  subtext: string;
  icon: string;
  tone: 'success' | 'danger' | 'primary' | 'warning' | 'info';
}

interface InfoItem {
  label: string;
  value: string;
}

@Component({
  selector: 'gd-harvest-season-details-page',
  imports: [
    Badge,
    BrCurrencyPipe,
    Button,
    Card,
    ConfirmDialog,
    Drawer,
    EmptyState,
    ErrorState,
    Input,
    LucideDynamicIcon,
    ReactiveFormsModule,
    Select,
    Skeleton,
    Textarea,
  ],
  templateUrl: './harvest-season-details-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HarvestSeasonDetailsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly harvestService = inject(HarvestSeasonService);
  private readonly transactionService = inject(FinancialTransactionService);
  private readonly productionActivityService = inject(ProductionActivityService);
  private readonly toastStore = inject(ToastStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly farmAccessStore = inject(FarmAccessStore);
  protected readonly sessionStore = inject(SessionStore);

  protected readonly harvest = signal<HarvestSeason | null>(null);
  protected readonly summary = signal<HarvestSeasonSummary | null>(null);
  protected readonly transactionsPage = signal<PageResponse<FinancialTransaction> | null>(null);
  protected readonly productionActivities = signal<ProductionActivity[]>([]);
  protected readonly loadingHarvest = signal(false);
  protected readonly harvestError = signal<string | null>(null);
  protected readonly summaryLoading = signal(false);
  protected readonly summaryError = signal<string | null>(null);
  protected readonly transactionsLoading = signal(false);
  protected readonly transactionsError = signal<string | null>(null);
  protected readonly drawerOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly deleteTarget = signal<HarvestSeason | null>(null);
  protected readonly deleteSubmitting = signal(false);
  protected readonly skeletons = [1, 2, 3, 4];

  private readonly harvestId = signal<number | null>(null);

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
    this.productionActivities().map((activity) => ({ label: activity.name, value: activity.id })),
  );
  protected readonly canManageHarvests = computed(() => {
    if (this.sessionStore.isAdmin()) {
      return true;
    }

    const harvest = this.harvest();

    return !!harvest && this.farmAccessStore.access()?.farmId === harvest.farmId && this.farmAccessStore.role() === 'PRODUCER';
  });
  protected readonly mainCards = computed<readonly SummaryCard[]>(() => {
    const summary = this.summary();

    return [
      {
        label: 'Custo realizado',
        value: summary?.realizedCost ?? 0,
        subtext: 'Despesas pagas da safra',
        icon: 'briefcase-business',
        tone: 'danger',
      },
      {
        label: 'Receita realizada',
        value: summary?.realizedRevenue ?? 0,
        subtext: 'Receitas pagas da safra',
        icon: 'trending-up',
        tone: 'success',
      },
      {
        label: 'Lucro realizado',
        value: summary?.realizedProfit ?? 0,
        subtext: 'Receitas menos custos pagos',
        icon: 'wallet',
        tone: (summary?.realizedProfit ?? 0) >= 0 ? 'primary' : 'danger',
      },
      {
        label: 'Lucro previsto',
        value: summary?.expectedProfit ?? this.estimatedProfit(this.harvest()),
        subtext: 'Receita prevista menos custo',
        icon: 'chart-no-axes-combined',
        tone: 'info',
      },
    ];
  });
  protected readonly secondaryCards = computed<readonly SummaryCard[]>(() => {
    const summary = this.summary();

    return [
      {
        label: 'Despesas pendentes',
        value: summary?.pendingExpenses ?? 0,
        subtext: 'Despesas a pagar',
        icon: 'calendar-clock',
        tone: 'warning',
      },
      {
        label: 'Despesas atrasadas',
        value: summary?.overdueExpenses ?? 0,
        subtext: 'Despesas vencidas',
        icon: 'alert-circle',
        tone: 'danger',
      },
      {
        label: 'Receitas pendentes',
        value: summary?.pendingRevenue ?? 0,
        subtext: 'Receitas a receber',
        icon: 'trending-up',
        tone: 'success',
      },
      {
        label: 'Movimentações vinculadas',
        value: summary?.transactionCount ?? this.transactionsPage()?.totalElements ?? 0,
        subtext: 'Receitas e despesas da safra',
        icon: 'receipt-text',
        tone: 'primary',
      },
    ];
  });
  protected readonly infoItems = computed<readonly InfoItem[]>(() => {
    const harvest = this.harvest();

    if (!harvest) {
      return [];
    }

    return [
      { label: 'Nome', value: harvest.name },
      { label: 'Fazenda', value: harvest.farmName ?? `Fazenda #${harvest.farmId}` },
      { label: 'Atividade', value: harvest.productionActivityName },
      { label: 'Status', value: this.statusLabel(harvest.status) },
      { label: 'Período', value: this.periodLabel(harvest) },
      { label: 'Área', value: this.hectareLabel(harvest.areaHectares) },
      { label: 'Custo previsto', value: this.currencyLabel(harvest.expectedCost ?? 0) },
      { label: 'Receita prevista', value: this.currencyLabel(harvest.expectedRevenue ?? 0) },
    ];
  });

  ngOnInit(): void {
    this.bindMoneySanitizer(this.form.controls.expectedCost);
    this.bindMoneySanitizer(this.form.controls.expectedRevenue);

    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      this.harvestError.set('Safra não encontrada.');
      return;
    }

    this.harvestId.set(id);
    this.loadDetails(id);
    this.loadFormOptions();
  }

  protected goBack(): void {
    void this.router.navigate(['/harvests']);
  }

  protected goToTransactions(): void {
    void this.router.navigate(['/transactions']);
  }

  protected retryHarvest(): void {
    const id = this.harvestId();

    if (id) {
      this.loadDetails(id);
    }
  }

  protected retrySummary(): void {
    const id = this.harvestId();

    if (id) {
      this.loadSummary(id);
    }
  }

  protected retryTransactions(): void {
    this.loadTransactions(this.transactionsPage()?.page ?? 0);
  }

  protected previousTransactionsPage(): void {
    const page = this.transactionsPage();

    if (page && !page.first) {
      this.loadTransactions(page.page - 1);
    }
  }

  protected nextTransactionsPage(): void {
    const page = this.transactionsPage();

    if (page && !page.last) {
      this.loadTransactions(page.page + 1);
    }
  }

  protected openEditDrawer(): void {
    const harvest = this.harvest();

    if (!harvest) {
      return;
    }

    if (!this.canManageHarvests()) {
      this.showPermissionError();
      return;
    }

    this.form.reset({
      productionActivityId: harvest.productionActivityId,
      name: harvest.name,
      description: harvest.description ?? '',
      startDate: harvest.startDate,
      endDate: harvest.endDate ?? '',
      expectedCost: numberToBrazilianMoney(harvest.expectedCost),
      expectedRevenue: numberToBrazilianMoney(harvest.expectedRevenue),
      areaHectares: harvest.areaHectares ?? '',
      status: harvest.status,
    });
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    if (!this.submitting()) {
      this.drawerOpen.set(false);
    }
  }

  protected saveHarvest(): void {
    const harvest = this.harvest();

    if (!harvest) {
      return;
    }

    if (!this.canManageHarvests()) {
      this.showPermissionError();
      return;
    }

    this.applyNumericValidation();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const productionActivityId = this.numberValue(this.form.controls.productionActivityId.value);
    const name = this.stringValue(this.form.controls.name.value);
    const startDate = this.stringValue(this.form.controls.startDate.value);

    if (productionActivityId === null || !name || !startDate) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildSavePayload(productionActivityId, name, startDate);
    const requestedStatus = this.statusValue(this.form.controls.status.value);

    this.submitting.set(true);

    this.harvestService
      .update(harvest.id, payload)
      .pipe(
        concatMap((updated) => {
          if (requestedStatus === harvest.status) {
            return of(updated);
          }

          return requestedStatus === 'INACTIVE'
            ? this.harvestService.inactivate(updated.id).pipe(concatMap(() => of(updated)))
            : this.harvestService.updateStatus(updated.id, requestedStatus);
        }),
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.drawerOpen.set(false);
          this.toastStore.success('Safra atualizada com sucesso.');
          this.loadDetails(harvest.id);
          this.loadFormOptions();
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  protected requestInactivate(): void {
    const harvest = this.harvest();

    if (!harvest) {
      return;
    }

    if (!this.canManageHarvests()) {
      this.showPermissionError();
      return;
    }

    this.deleteTarget.set(harvest);
  }

  protected closeDeleteConfirmation(): void {
    if (!this.deleteSubmitting()) {
      this.deleteTarget.set(null);
    }
  }

  protected confirmInactivate(): void {
    const harvest = this.deleteTarget();

    if (!harvest || this.deleteSubmitting()) {
      return;
    }

    this.deleteSubmitting.set(true);

    this.harvestService
      .inactivate(harvest.id)
      .pipe(
        finalize(() => this.deleteSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.deleteTarget.set(null);
          this.toastStore.success('Safra inativada com sucesso.');
          this.loadDetails(harvest.id);
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

  protected summaryToneClasses(tone: SummaryCard['tone']): string {
    const tones: Record<SummaryCard['tone'], string> = {
      primary: 'bg-highlight-soft text-primary',
      success: 'bg-success/10 text-success',
      danger: 'bg-danger/10 text-danger',
      info: 'bg-info/10 text-info',
      warning: 'bg-warning/10 text-amber-700 dark:text-amber-300',
    };

    return tones[tone];
  }

  protected periodLabel(harvest: HarvestSeason): string {
    const endDate = harvest.endDate ? this.formatDate(harvest.endDate) : 'Sem data final';

    return `${this.formatDate(harvest.startDate)} a ${endDate}`;
  }

  protected hectareLabel(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : `${value} ha`;
  }

  protected nullableCurrencyLabel(value: number | null): string {
    return value === null ? '—' : this.currencyLabel(value);
  }

  protected currencyLabel(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  protected transactionTypeLabel(type: string): string {
    return type === 'INCOME' ? 'Receita' : 'Despesa';
  }

  protected transactionStatusLabel(status: PaymentStatus): string {
    const labels: Record<string, string> = {
      PENDING: 'Pendente',
      PAID: 'Pago',
      OVERDUE: 'Atrasado',
      CANCELED: 'Cancelado',
    };

    return labels[status] ?? status;
  }

  protected transactionStatusVariant(status: PaymentStatus): BadgeVariant {
    if (status === 'PAID') {
      return 'success';
    }

    if (status === 'OVERDUE' || status === 'CANCELED') {
      return 'danger';
    }

    return 'warning';
  }

  protected transactionAmountClasses(transaction: FinancialTransaction): string {
    return transaction.type === 'INCOME' ? 'text-success' : 'text-danger';
  }

  protected transactionAmountPrefix(transaction: FinancialTransaction): string {
    return transaction.type === 'INCOME' ? '+ ' : '- ';
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

  private loadDetails(id: number): void {
    this.loadingHarvest.set(true);
    this.harvestError.set(null);
    this.harvest.set(null);
    this.transactionsPage.set(null);
    this.transactionsError.set(null);

    this.loadSummary(id);

    this.harvestService
      .getById(id)
      .pipe(
        finalize(() => this.loadingHarvest.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (harvest) => {
          this.harvest.set(harvest);
          this.loadTransactions(0);
        },
        error: (error: unknown) => this.handleHarvestError(error),
      });
  }

  private loadSummary(id: number): void {
    this.summaryLoading.set(true);
    this.summaryError.set(null);

    this.harvestService
      .getSummary(id)
      .pipe(
        finalize(() => this.summaryLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (summary) => this.summary.set(summary),
        error: () => {
          this.summary.set(null);
          this.summaryError.set('Não foi possível carregar o resumo financeiro.');
        },
      });
  }

  private loadTransactions(page: number): void {
    const harvest = this.harvest();

    if (!harvest) {
      return;
    }

    this.transactionsLoading.set(true);
    this.transactionsError.set(null);

    this.transactionService
      .listByFarm({
        farmId: harvest.farmId,
        harvestSeasonId: harvest.id,
        page,
        size: this.transactionsPage()?.size ?? 10,
        sort: 'transactionDate',
        direction: 'DESC',
      })
      .pipe(
        finalize(() => this.transactionsLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.transactionsPage.set(response),
        error: () => {
          this.transactionsPage.set(null);
          this.transactionsError.set('Não foi possível carregar as movimentações vinculadas.');
        },
      });
  }

  private loadFormOptions(): void {
    forkJoin({ activities: this.productionActivityService.listActive() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ activities }) => this.productionActivities.set(activities),
        error: () => this.productionActivities.set([]),
      });
  }

  private handleHarvestError(error: unknown): void {
    this.harvest.set(null);
    this.transactionsPage.set(null);

    if (error instanceof HttpErrorResponse && error.status === 404) {
      this.harvestError.set('Safra não encontrada.');
      return;
    }

    if (error instanceof HttpErrorResponse && error.status === 403) {
      this.harvestError.set('Você não tem permissão para visualizar esta safra.');
      return;
    }

    this.harvestError.set('Não foi possível carregar os detalhes da safra.');
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

  private estimatedProfit(harvest: HarvestSeason | null): number {
    return (harvest?.expectedRevenue ?? 0) - (harvest?.expectedCost ?? 0);
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

  private statusValue(value: GdFormValue): HarvestSeasonStatus {
    const status = `${value ?? ''}`;

    return status === 'IN_PROGRESS' || status === 'FINISHED' || status === 'INACTIVE' ? status : 'PLANNED';
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
    return typeof value === 'string' ? value.trim() : `${value ?? ''}`.trim();
  }
}
