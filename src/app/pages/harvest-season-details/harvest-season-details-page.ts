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
import { finalize, Observable } from 'rxjs';

import {
  HarvestSeason,
  HarvestSeasonStatus,
  HarvestSeasonDetailSummary,
  UpdateHarvestSeasonRequest,
} from '../../core/models/harvest-season.models';
import {
  FinancialTransaction,
  PaymentStatus,
} from '../../core/models/financial-transaction.models';
import { PageResponse } from '../../core/models/page-response.model';
import { ProductionActivity } from '../../core/models/production-activity.models';
import { FinancialTransactionService } from '../../core/services/financial-transaction.service';
import {
  HarvestSeasonService,
  InvalidHarvestSeasonDetailSummaryError,
} from '../../core/services/harvest-season.service';
import { ProductionActivityService } from '../../core/services/production-activity.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import {
  GdFormControl,
  GdFormValue,
  GdSelectOption,
  Input,
  Select,
  Textarea,
} from '../../shared/forms';
import { ConfirmDialog, ConfirmDialogVariant, Drawer } from '../../shared/overlays';
import { BrCurrencyPipe } from '../../shared/pipes/br-currency.pipe';
import {
  Badge,
  BadgeVariant,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  StatusActionSection,
  SummaryCard,
  SummaryCardTone,
} from '../../shared/ui';
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
}

interface DetailSummaryCard {
  title: string;
  value: string;
  description: string;
  detail?: string;
  icon: string;
  tone: SummaryCardTone;
}

interface InfoItem {
  label: string;
  value: string;
}

interface StatusConfirmation {
  title: string;
  description: string;
  confirmLabel: string;
  variant: ConfirmDialogVariant;
  action: 'activate' | 'inactivate';
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
    StatusActionSection,
    SummaryCard,
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
  protected readonly summary = signal<HarvestSeasonDetailSummary | null>(null);
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
  protected readonly statusTarget = signal<HarvestSeason | null>(null);
  protected readonly statusSubmitting = signal(false);
  protected readonly skeletons = Array.from({ length: 15 }, (_, index) => index + 1);

  private readonly harvestId = signal<number | null>(null);

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
    },
    { validators: [this.dateRangeValidator()] },
  );

  protected readonly activityOptions = computed<readonly GdSelectOption[]>(() => {
    const currentActivityId = this.harvest()?.productionActivityId ?? null;

    return this.productionActivities()
      .filter((activity) => activity.status === 'ACTIVE' || activity.id === currentActivityId)
      .map((activity) => ({ label: activity.name, value: activity.id }));
  });
  protected readonly canManageHarvests = computed(() => {
    if (this.sessionStore.isAdmin()) {
      return true;
    }

    const harvest = this.harvest();

    return (
      !!harvest &&
      this.farmAccessStore.access()?.farmId === harvest.farmId &&
      this.farmAccessStore.role() === 'PRODUCER'
    );
  });
  protected readonly summaryCards = computed<readonly DetailSummaryCard[]>(() => {
    const summary = this.summary();

    if (!summary) {
      return [];
    }

    const { planning, realized, projection, comparison, openAmounts } = summary;

    const pending = openAmounts?.pending;
    const overdue = openAmounts?.overdue;

    if (!pending || !overdue) {
      return [];
    }

    const payableAmount = pending.payableAmount + overdue.payableAmount;
    const receivableAmount = pending.receivableAmount + overdue.receivableAmount;

    return [
      this.currencyCard(
        'Custo planejado',
        planning.plannedCost,
        'Valor de custos planejados para a safra.',
        'briefcase-business',
        'warning',
      ),
      this.currencyCard(
        'Receita planejada',
        planning.plannedRevenue,
        'Valor de receitas planejadas para a safra.',
        'trending-up',
        'success',
      ),
      this.profitCard(
        'Lucro planejado',
        planning.plannedProfit,
        'Resultado planejado da safra.',
        'chart-no-axes-combined',
      ),
      this.currencyCard(
        'Custo realizado',
        realized.realizedCost,
        'Custos realizados nas movimentações da safra.',
        'briefcase-business',
        'warning',
      ),
      this.currencyCard(
        'Receita realizada',
        realized.realizedRevenue,
        'Receitas realizadas nas movimentações da safra.',
        'trending-up',
        'success',
      ),
      this.profitCard(
        'Lucro realizado',
        realized.realizedProfit,
        'Resultado realizado da safra.',
        'wallet',
      ),
      this.currencyCard(
        'Custo projetado',
        projection.projectedCost,
        'Custo estimado ao final da safra.',
        'briefcase-business',
        'warning',
      ),
      this.currencyCard(
        'Receita projetada',
        projection.projectedRevenue,
        'Receita estimada ao final da safra.',
        'trending-up',
        'success',
      ),
      this.profitCard(
        'Lucro projetado',
        projection.projectedProfit,
        'Resultado estimado ao final da safra.',
        'chart-no-axes-combined',
      ),
      {
        title: 'Desempenho do lucro',
        value: this.percentageLabel(comparison.profitPerformancePercentage),
        description: 'Comparação do lucro projetado com o planejado.',
        detail: this.comparisonStatusLabel(comparison.profitPerformanceStatus),
        icon: 'chart-no-axes-column-increasing',
        tone: this.profitPerformanceTone(comparison.profitPerformanceStatus),
      },
      {
        title: 'Desvio de custo',
        value: this.currencyLabel(comparison.costVarianceAmount),
        description: 'Diferença entre o custo projetado e o custo planejado.',
        detail: this.comparisonStatusLabel(
          comparison.costVarianceStatus,
          comparison.costVariancePercentage,
        ),
        icon: 'chart-spline',
        tone: this.costVarianceTone(comparison.costVarianceStatus),
      },
      this.moneyCard(
        'A pagar',
        payableAmount,
        'Total de contas em aberto a pagar.',
        'calendar-clock',
        'warning',
      ),
      this.moneyCard(
        'A receber',
        receivableAmount,
        'Total de contas em aberto a receber.',
        'calendar-clock',
        'success',
      ),
      this.moneyCard(
        'Vencidas a pagar',
        overdue.payableAmount,
        'Total de contas vencidas a pagar.',
        'alert-circle',
        'warning',
      ),
      this.moneyCard(
        'Vencidas a receber',
        overdue.receivableAmount,
        'Total de contas vencidas a receber.',
        'alert-circle',
        'success',
      ),
    ];
  });
  protected readonly infoItems = computed<readonly InfoItem[]>(() => {
    const harvest = this.harvest();

    if (!harvest) {
      return [];
    }

    return [
      { label: 'Nome', value: this.emptyLabel(harvest.name) },
      { label: 'Descrição', value: this.emptyLabel(harvest.description) },
      { label: 'Atividade produtiva', value: this.emptyLabel(harvest.productionActivityName) },
      {
        label: 'Fazenda',
        value: this.emptyLabel(harvest.farmName ?? `Fazenda #${harvest.farmId}`),
      },
      { label: 'Status', value: this.statusLabel(harvest.status) },
      { label: 'Data inicial', value: this.dateLabel(harvest.startDate) },
      { label: 'Data final', value: harvest.endDate ? this.dateLabel(harvest.endDate) : '—' },
      { label: 'Área em hectares', value: this.hectareLabel(harvest.areaHectares) },
      { label: 'Custo previsto', value: this.nullableCurrencyLabel(harvest.expectedCost ?? null) },
      {
        label: 'Receita prevista',
        value: this.nullableCurrencyLabel(harvest.expectedRevenue ?? null),
      },
      { label: 'Criado em', value: harvest.createdAt ? this.dateLabel(harvest.createdAt) : '—' },
      {
        label: 'Atualizado em',
        value: harvest.updatedAt ? this.dateLabel(harvest.updatedAt) : '—',
      },
    ];
  });
  protected readonly statusConfirmation = computed<StatusConfirmation>(() => {
    const activating = this.statusTarget()?.status === 'INACTIVE';

    return activating
      ? {
          title: 'Ativar safra?',
          description:
            'Esta safra voltará a ficar disponível para acompanhamento e novas operações.',
          confirmLabel: 'Ativar',
          variant: 'info',
          action: 'activate',
        }
      : {
          title: 'Inativar safra?',
          description:
            'Esta safra deixará de ficar disponível para novas operações, mas os registros existentes serão preservados.',
          confirmLabel: 'Inativar',
          variant: 'warning',
          action: 'inactivate',
        };
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

    this.submitting.set(true);

    this.harvestService
      .update(harvest.id, payload)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.drawerOpen.set(false);
          this.toastStore.success('Safra atualizada com sucesso.');
          this.loadDetails(harvest.id);
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  protected requestStatusChange(): void {
    const harvest = this.harvest();

    if (!harvest) {
      return;
    }

    if (!this.canManageHarvests()) {
      this.showPermissionError();
      return;
    }

    this.statusTarget.set(harvest);
  }

  protected closeStatusConfirmation(): void {
    if (!this.statusSubmitting()) {
      this.statusTarget.set(null);
    }
  }

  protected confirmStatusChange(): void {
    const harvest = this.statusTarget();

    if (!harvest || this.statusSubmitting()) {
      return;
    }

    const confirmation = this.statusConfirmation();
    const request$: Observable<unknown> =
      confirmation.action === 'activate'
        ? this.harvestService.activate(harvest.id)
        : this.harvestService.inactivate(harvest.id);

    this.statusSubmitting.set(true);

    request$
      .pipe(
        finalize(() => this.statusSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.statusTarget.set(null);
          this.drawerOpen.set(false);
          this.toastStore.success(
            confirmation.action === 'activate'
              ? 'Safra ativada com sucesso.'
              : 'Safra inativada com sucesso.',
          );
          this.loadDetails(harvest.id);
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  protected statusActionDescription(status: HarvestSeasonStatus): string {
    return status === 'INACTIVE'
      ? 'Esta safra está inativa e não fica disponível para novas operações.'
      : 'Esta safra está disponível para acompanhamento e novas operações.';
  }

  protected statusActionLabel(status: HarvestSeasonStatus): string {
    return status === 'INACTIVE' ? 'Ativar' : 'Inativar';
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

  private currencyCard(
    title: string,
    amount: number,
    description: string,
    icon: string,
    tone: SummaryCardTone,
  ): DetailSummaryCard {
    return { title, value: this.currencyLabel(amount), description, icon, tone };
  }

  private profitCard(
    title: string,
    amount: number,
    description: string,
    icon: string,
  ): DetailSummaryCard {
    return this.currencyCard(title, amount, description, icon, this.profitTone(amount));
  }

  private moneyCard(
    title: string,
    amount: number,
    description: string,
    icon: string,
    tone: SummaryCardTone,
  ): DetailSummaryCard {
    return { title, value: this.currencyLabel(amount), description, icon, tone };
  }

  private profitTone(value: number): SummaryCardTone {
    return value > 0 ? 'success' : value < 0 ? 'danger' : 'neutral';
  }

  private profitPerformanceTone(status: string): SummaryCardTone {
    if (status === 'ABOVE_PLANNED') return 'success';
    if (status === 'BELOW_PLANNED') return 'danger';
    if (status === 'ON_TARGET') return 'info';
    return 'neutral';
  }

  private costVarianceTone(status: string): SummaryCardTone {
    if (status === 'BELOW_PLANNED') return 'success';
    if (status === 'ABOVE_PLANNED') return 'danger';
    if (status === 'ON_TARGET') return 'info';
    return 'neutral';
  }

  private comparisonStatusLabel(status: string, percentage?: number | null): string {
    const labels: Record<string, string> = {
      ABOVE_PLANNED: 'Acima do planejado',
      BELOW_PLANNED: 'Abaixo do planejado',
      ON_TARGET: 'Dentro do planejado',
      NOT_APPLICABLE: 'Não aplicável',
    };
    const label = labels[status] ?? status;

    return percentage === undefined ? label : label + ' · ' + this.percentageLabel(percentage);
  }

  private percentageLabel(value: number | null): string {
    return value === null
      ? '—'
      : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value) + '%';
  }

  private countLabel(count: number): string {
    return count === 1 ? '1 conta' : count + ' contas';
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
    return this.dateLabel(date);
  }

  protected dateLabel(date: string): string {
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
          this.loadFormOptions(harvest.farmId);
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
        error: (error: unknown) => {
          this.summary.set(null);
          this.summaryError.set(
            error instanceof InvalidHarvestSeasonDetailSummaryError
              ? 'Não foi possível interpretar o resumo financeiro da safra.'
              : 'Não foi possível carregar o resumo financeiro da safra.',
          );
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
          this.transactionsError.set('Não foi possível carregar as movimentações da safra.');
        },
      });
  }

  private loadFormOptions(farmId: number): void {
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
        error: () => this.productionActivities.set([]),
      });
  }

  private emptyLabel(value: string | null | undefined): string {
    const text = `${value ?? ''}`.trim();

    return text || '—';
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
