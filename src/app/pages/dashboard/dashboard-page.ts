import { DOCUMENT } from '@angular/common';
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
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription, catchError, finalize, forkJoin, of } from 'rxjs';

import { ParsedTransactionResponse } from '../../core/models/ai-transaction.models';
import { FinancialCategory } from '../../core/models/financial-category.models';
import {
  FinancialAlerts,
  FinancialSummary,
  FinancialTransaction as DashboardFinancialTransaction,
} from '../../core/models/financial.models';
import { DashboardHarvestSeason, HarvestSeason } from '../../core/models/harvest-season.models';
import {
  CreateFinancialTransactionRequest,
  FinancialTransactionDraft,
  PaymentMethod,
  PaymentStatus,
  TransactionType,
  UpdateFinancialTransactionRequest,
} from '../../core/models/financial-transaction.models';
import { AiTransactionService } from '../../core/services/ai-transaction.service';
import { DashboardAiTransactionActionService } from '../../core/services/dashboard-ai-transaction-action.service';
import { FinancialCategoryService } from '../../core/services/financial-category.service';
import { FinancialTransactionService } from '../../core/services/financial-transaction.service';
import { FinancialService } from '../../core/services/financial.service';
import { HarvestSeasonService } from '../../core/services/harvest-season.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { GdFormValue, Textarea } from '../../shared/forms';
import { Drawer } from '../../shared/overlays';
import { BrCurrencyPipe } from '../../shared/pipes/br-currency.pipe';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  SummaryCard,
  SummaryCardTone,
  Tooltip,
} from '../../shared/ui';
import { ImportantAlerts } from './components/important-alerts/important-alerts';
import { LatestTransactionsCard } from './components/latest-transactions-card/latest-transactions-card';
import { TransactionFormDrawer } from '../transactions/components/transaction-form-drawer/transaction-form-drawer';

interface SummaryCardViewModel {
  title: string;
  value: string;
  description: string;
  detail?: string;
  icon: string;
  tone: SummaryCardTone;
}

@Component({
  selector: 'gd-dashboard-page',
  imports: [
    Badge,
    Button,
    Card,
    Drawer,
    EmptyState,
    ErrorState,
    ImportantAlerts,
    LatestTransactionsCard,
    ReactiveFormsModule,
    RouterLink,
    Skeleton,
    SummaryCard,
    Tooltip,
    Textarea,
    TransactionFormDrawer,
  ],
  templateUrl: './dashboard-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly document = inject(DOCUMENT);
  private readonly aiTransactionService = inject(AiTransactionService);
  private readonly dashboardAiTransactionAction = inject(DashboardAiTransactionActionService);
  private readonly categoryService = inject(FinancialCategoryService);
  private readonly financialService = inject(FinancialService);
  private readonly transactionService = inject(FinancialTransactionService);
  private readonly harvestSeasonService = inject(HarvestSeasonService);
  private readonly toastStore = inject(ToastStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly farmAccessStore = inject(FarmAccessStore);
  protected readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly sessionStore = inject(SessionStore);

  protected readonly summary = signal<FinancialSummary | null>(null);
  protected readonly summaryLoading = signal(false);
  protected readonly summaryError = signal<string | null>(null);

  protected readonly transactions = signal<readonly DashboardFinancialTransaction[]>([]);
  protected readonly transactionsLoading = signal(false);
  protected readonly transactionsError = signal<string | null>(null);

  protected readonly alerts = signal<FinancialAlerts | null>(null);
  protected readonly alertsLoading = signal(false);
  protected readonly alertsError = signal<string | null>(null);

  protected readonly inProgressHarvests = signal<readonly DashboardHarvestSeason[]>([]);
  protected readonly harvestsLoading = signal(false);
  protected readonly harvestsError = signal<string | null>(null);

  protected readonly quickTransactionControl = new FormControl<GdFormValue>('', {
    validators: [Validators.required],
  });
  private readonly quickTransactionText = signal('');
  protected readonly quickTransactionError = signal<string | null>(null);
  protected readonly quickTransactionPromptDrawerOpen = signal(false);
  protected readonly quickTransactionDrawerOpen = signal(false);
  protected readonly quickTransactionDraft = signal<FinancialTransactionDraft | null>(null);
  protected readonly quickTransactionWarnings = signal<readonly string[]>([]);
  protected readonly quickTransactionCategories = signal<readonly FinancialCategory[]>([]);
  protected readonly quickTransactionHarvestSeasons = signal<readonly HarvestSeason[]>([]);
  protected readonly isParsingTransaction = signal(false);
  protected readonly transactionSubmitting = signal(false);

  private readonly reloadTrigger = signal(0);

  protected readonly summarySkeletons = [1, 2, 3, 4, 5, 6, 7, 8];
  protected readonly harvestSkeletons = [1, 2, 3];

  private readonly currencyPipe = new BrCurrencyPipe();
  private handledAiTransactionOpenRequest = this.dashboardAiTransactionAction.openRequest();

  protected readonly summaryCards = computed<readonly SummaryCardViewModel[]>(() => {
    const summary = this.summary();

    if (!summary) {
      return [];
    }

    return [
      {
        title: 'Saldo atual',
        value: this.formatCurrency(summary.currentBalance),
        description: 'Resultado financeiro já realizado: entradas pagas menos saídas pagas.',
        detail: 'Considera apenas movimentações pagas.',
        icon: 'wallet',
        tone: summary.currentBalance >= 0 ? 'success' : 'danger',
      },
      {
        title: 'Entradas previstas',
        value: this.formatCurrency(summary.expectedIncome),
        description: 'Total de receitas que ainda não foram recebidas.',
        detail: 'Inclui entradas pendentes e atrasadas, exceto canceladas.',
        icon: 'trending-up',
        tone: 'success',
      },
      {
        title: 'Saídas previstas',
        value: this.formatCurrency(summary.expectedExpense),
        description: 'Total de despesas que ainda não foram pagas.',
        detail: 'Inclui saídas pendentes e atrasadas, exceto canceladas.',
        icon: 'trending-down',
        tone: 'warning',
      },
      {
        title: 'Saldo projetado',
        value: this.formatCurrency(summary.projectedBalance),
        description: 'Saldo esperado após considerar entradas e saídas previstas.',
        detail: 'Calculado por: saldo atual + entradas previstas - saídas previstas.',
        icon: 'wallet',
        tone: summary.projectedBalance >= 0 ? 'success' : 'danger',
      },
      {
        title: 'A pagar em 30 dias',
        value: this.formatCurrency(summary.payableNext30Days),
        description: 'Despesas pendentes com vencimento nos próximos 30 dias.',
        detail: 'Não inclui contas já atrasadas.',
        icon: 'calendar-clock',
        tone: 'warning',
      },
      {
        title: 'Atrasado',
        value: this.formatCurrency(summary.overdueExpenses),
        description: 'Despesas vencidas que ainda não foram pagas.',
        detail: 'Indica compromissos financeiros em atraso.',
        icon: 'alert-circle',
        tone: 'danger',
      },
      {
        title: 'A receber em 30 dias',
        value: this.formatCurrency(summary.receivableNext30Days),
        description: 'Receitas atrasadas ou previstas para os próximos 30 dias.',
        detail: 'Ajuda a visualizar o dinheiro que deve entrar no curto prazo.',
        icon: 'landmark',
        tone: 'info',
      },
      {
        title: 'Fluxo 30 dias',
        value: this.formatCurrency(summary.cashFlowNext30Days),
        description: 'Diferença entre valores a receber e contas a pagar no curto prazo.',
        detail: 'Calculado por: a receber - a pagar em 30 dias - atrasado.',
        icon: 'chart-no-axes-combined',
        tone: summary.cashFlowNext30Days >= 0 ? 'success' : 'danger',
      },
    ];
  });

  protected readonly emptyFarmDescription = computed(() => {
    if (this.selectedFarmStore.loaded() && !this.selectedFarmStore.hasFarms()) {
      return 'Nenhuma fazenda está disponível para o seu usuário.';
    }

    return 'Selecione uma fazenda no topo do dashboard para visualizar os indicadores financeiros.';
  });

  protected readonly canUseQuickTransaction = computed(() => {
    const user = this.sessionStore.user();
    const farmId = this.selectedFarmStore.selectedFarmId();

    if (user?.status !== 'ACTIVE' || !farmId) {
      return false;
    }

    if (this.sessionStore.isAdmin()) {
      return true;
    }

    const access = this.farmAccessStore.access();

    return (
      access?.farmId === farmId &&
      (access.role === 'PRODUCER' || access.role === 'EMPLOYEE') &&
      access.permissions.canManageTransactions
    );
  });

  protected readonly quickTransactionDisabled = computed(
    () =>
      !this.canUseQuickTransaction() ||
      !this.quickTransactionText().trim() ||
      this.isParsingTransaction(),
  );
  protected readonly quickTransactionPromptDescription =
    'Descreva a movimentação em linguagem natural e revise os dados antes de salvar.';

  constructor() {
    this.quickTransactionControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.quickTransactionText.set(`${value ?? ''}`);
        this.quickTransactionError.set(null);
      });

    effect(() => {
      const request = this.dashboardAiTransactionAction.openRequest();

      if (request === this.handledAiTransactionOpenRequest) {
        return;
      }

      this.handledAiTransactionOpenRequest = request;

      if (request > 0) {
        this.openQuickTransactionPromptDrawer();
      }
    });

    effect((onCleanup) => {
      const farmId = this.selectedFarmStore.selectedFarmId();
      const access = this.farmAccessStore.access();
      const accessLoading = this.farmAccessStore.loading();
      this.reloadTrigger();

      if (
        !farmId ||
        accessLoading ||
        access?.farmId !== farmId ||
        !access.permissions.canViewFinancial
      ) {
        this.clearDashboardData();
        return;
      }

      const subscriptions = new Subscription();
      this.loadSummary(farmId, subscriptions);
      this.loadTransactions(farmId, subscriptions);
      this.loadAlerts(farmId, subscriptions);
      this.loadInProgressHarvests(farmId, subscriptions);

      onCleanup(() => subscriptions.unsubscribe());
    });
  }

  private loadSummary(farmId: number, subscriptions: Subscription): void {
    this.summary.set(null);
    this.summaryError.set(null);
    this.summaryLoading.set(true);

    subscriptions.add(
      this.financialService
        .getSummary(farmId)
        .pipe(finalize(() => this.summaryLoading.set(false)))
        .subscribe({
          next: (summary) => this.summary.set(summary),
          error: () => this.summaryError.set('Não foi possível carregar o resumo financeiro.'),
        }),
    );
  }

  private loadTransactions(farmId: number, subscriptions: Subscription): void {
    this.transactions.set([]);
    this.transactionsError.set(null);
    this.transactionsLoading.set(true);

    subscriptions.add(
      this.financialService
        .getLatestTransactions(farmId)
        .pipe(finalize(() => this.transactionsLoading.set(false)))
        .subscribe({
          next: (response) => this.transactions.set(response.content),
          error: () =>
            this.transactionsError.set('Não foi possível carregar as últimas movimentações.'),
        }),
    );
  }

  private loadAlerts(farmId: number, subscriptions: Subscription): void {
    this.alerts.set(null);
    this.alertsError.set(null);
    this.alertsLoading.set(true);

    subscriptions.add(
      this.financialService
        .getAlerts(farmId)
        .pipe(finalize(() => this.alertsLoading.set(false)))
        .subscribe({
          next: (alerts) => this.alerts.set(alerts),
          error: () => this.alertsError.set('Não foi possível carregar os alertas financeiros.'),
        }),
    );
  }

  private loadInProgressHarvests(farmId: number, subscriptions: Subscription): void {
    this.inProgressHarvests.set([]);
    this.harvestsError.set(null);
    this.harvestsLoading.set(true);

    subscriptions.add(
      this.harvestSeasonService
        .getDashboardHarvests(farmId)
        .pipe(finalize(() => this.harvestsLoading.set(false)))
        .subscribe({
          next: (harvests) => this.inProgressHarvests.set(harvests),
          error: () =>
            this.harvestsError.set("Não foi possível carregar as safras em andamento."),
        }),
    );
  }

  protected openQuickTransactionPromptDrawer(): void {
    this.quickTransactionError.set(null);

    if (!this.selectedFarmStore.selectedFarmId()) {
      this.quickTransactionError.set('Selecione uma fazenda para registrar uma movimentação.');
      return;
    }

    if (!this.canUseQuickTransaction()) {
      this.quickTransactionError.set('Você não tem permissão para usar a movimentação rápida.');
      return;
    }

    this.quickTransactionPromptDrawerOpen.set(true);
    setTimeout(() => this.focusQuickTransactionTextarea());
  }

  protected closeQuickTransactionPromptDrawer(): void {
    if (this.isParsingTransaction()) {
      return;
    }

    this.quickTransactionPromptDrawerOpen.set(false);
    this.quickTransactionControl.reset('');
    this.quickTransactionError.set(null);
  }

  protected parseQuickTransaction(): void {
    const farmId = this.selectedFarmStore.selectedFarmId();
    const text = this.trimmedQuickTransactionText();

    this.quickTransactionError.set(null);
    this.quickTransactionControl.markAsTouched();

    if (!farmId) {
      this.quickTransactionError.set('Selecione uma fazenda para usar a movimentação rápida.');
      return;
    }

    if (!this.canUseQuickTransaction()) {
      this.quickTransactionError.set('Você não tem permissão para usar a movimentação rápida.');
      return;
    }

    if (!text) {
      this.quickTransactionError.set('Informe o texto da movimentação.');
      this.quickTransactionControl.setErrors({ required: true });
      return;
    }

    this.isParsingTransaction.set(true);

    forkJoin({
      parsed: this.aiTransactionService.parseTransactionText({ farmId, text }),
      categories: this.categoryService
        .listByFarm(farmId, { status: 'ACTIVE' })
        .pipe(catchError(() => of([]))),
      harvestSeasons: this.harvestSeasonService
        .list({
          farmId,
          includeInactive: true,
          page: 0,
          size: 100,
          sort: 'startDate',
          direction: 'DESC',
        })
        .pipe(
          catchError(() =>
            of({
              content: [],
              page: 0,
              size: 100,
              totalElements: 0,
              totalPages: 0,
              first: true,
              last: true,
            }),
          ),
        ),
    })
      .pipe(
        finalize(() => this.isParsingTransaction.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ parsed, categories, harvestSeasons }) => {
          this.quickTransactionCategories.set(categories);
          this.quickTransactionHarvestSeasons.set(harvestSeasons.content);
          this.quickTransactionPromptDrawerOpen.set(false);
          this.openQuickTransactionDrawer(parsed, categories, harvestSeasons.content);
        },
        error: (error: unknown) => this.handleParseError(error),
      });
  }

  protected closeQuickTransactionDrawer(): void {
    if (this.transactionSubmitting()) {
      return;
    }

    this.quickTransactionDrawerOpen.set(false);
    this.quickTransactionDraft.set(null);
    this.quickTransactionWarnings.set([]);
    this.quickTransactionControl.reset('');
    this.quickTransactionError.set(null);
  }

  protected saveQuickTransaction(payload: UpdateFinancialTransactionRequest): void {
    const farmId = this.selectedFarmStore.selectedFarmId();

    if (!farmId || this.transactionSubmitting() || !this.canUseQuickTransaction()) {
      this.quickTransactionError.set('Você não tem permissão para usar a movimentação rápida.');
      return;
    }

    const request: CreateFinancialTransactionRequest = { ...payload, farmId };
    this.transactionSubmitting.set(true);

    this.transactionService
      .create(request)
      .pipe(
        finalize(() => this.transactionSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.quickTransactionDrawerOpen.set(false);
          this.quickTransactionPromptDrawerOpen.set(false);
          this.quickTransactionDraft.set(null);
          this.quickTransactionWarnings.set([]);
          this.quickTransactionControl.reset('');
          this.toastStore.success('Movimentação criada com sucesso.');
          this.reloadDashboardData();
        },
        error: () => this.toastStore.error('Não foi possível salvar a movimentação.'),
      });
  }

  private openQuickTransactionDrawer(
    parsed: ParsedTransactionResponse,
    categories: readonly FinancialCategory[],
    harvestSeasons: readonly HarvestSeason[],
  ): void {
    const { draft, warnings } = this.buildTransactionDraft(parsed, categories, harvestSeasons);

    this.quickTransactionDraft.set(draft);
    this.quickTransactionWarnings.set(warnings);
    this.quickTransactionDrawerOpen.set(true);
  }

  private buildTransactionDraft(
    parsed: ParsedTransactionResponse,
    categories: readonly FinancialCategory[],
    harvestSeasons: readonly HarvestSeason[],
  ): { draft: FinancialTransactionDraft; warnings: readonly string[] } {
    const warnings = new Set<string>();
    const type = this.normalizedTransactionType(parsed.type, warnings);
    const status = this.normalizedPaymentStatus(parsed.paymentStatus, warnings);
    const paymentMethod = this.normalizedPaymentMethod(parsed.paymentMethod, warnings);
    const transactionDate = parsed.transactionDate ?? this.currentDate();

    if (!parsed.transactionDate) {
      warnings.add('Data não identificada, usando data atual.');
    }

    for (const warning of parsed.warnings ?? []) {
      warnings.add(warning);
    }

    for (const field of parsed.missingFields ?? []) {
      warnings.add(`Campo não identificado pela IA: ${field}.`);
    }

    if (parsed.confidence < 0.6) {
      warnings.add('A interpretação pode estar incompleta. Revise os campos.');
    }

    const categoryId = this.findMatchingCategoryId(parsed.categoryName, type, categories);
    if (parsed.categoryName && categoryId === null) {
      warnings.add(`Categoria sugerida pela IA não encontrada: "${parsed.categoryName}".`);
    }

    const harvestSeasonId = this.findMatchingHarvestSeasonId(
      parsed.harvestSeasonName,
      harvestSeasons,
    );
    if (parsed.harvestSeasonName && harvestSeasonId === null) {
      warnings.add(`Safra sugerida pela IA não encontrada: "${parsed.harvestSeasonName}".`);
    }

    return {
      draft: {
        description: parsed.description?.trim() || this.trimmedQuickTransactionText(),
        amount: parsed.amount,
        type,
        status,
        paymentMethod,
        transactionDate,
        dueDate: parsed.dueDate,
        paidAt: null,
        notes: null,
        categoryId,
        harvestSeasonId,
      },
      warnings: [...warnings],
    };
  }

  private findMatchingCategoryId(
    categoryName: string | null,
    type: TransactionType,
    categories: readonly FinancialCategory[],
  ): number | null {
    if (!categoryName) {
      return null;
    }

    const target = this.normalizeComparisonText(categoryName);
    const match = categories
      .filter((category) => category.status === 'ACTIVE' && category.type === type)
      .find((category) => this.namesMatch(this.normalizeComparisonText(category.name), target));

    return match?.id ?? null;
  }

  private findMatchingHarvestSeasonId(
    harvestSeasonName: string | null,
    harvestSeasons: readonly HarvestSeason[],
  ): number | null {
    if (!harvestSeasonName) {
      return null;
    }

    const target = this.normalizeComparisonText(harvestSeasonName);
    const match = harvestSeasons
      .filter((season) => season.status === 'PLANNED' || season.status === 'IN_PROGRESS')
      .find((season) => this.namesMatch(this.normalizeComparisonText(season.name), target));

    return match?.id ?? null;
  }

  private namesMatch(candidate: string, target: string): boolean {
    return candidate === target || candidate.includes(target) || target.includes(candidate);
  }

  private normalizeComparisonText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private normalizedTransactionType(
    value: string,
    warnings: Set<string>,
  ): TransactionType {
    if (value === 'INCOME' || value === 'EXPENSE') {
      return value;
    }

    warnings.add(`Tipo sugerido pela IA não reconhecido: "${value}". Usando despesa.`);
    return 'EXPENSE';
  }

  private normalizedPaymentStatus(value: string, warnings: Set<string>): PaymentStatus {
    if (value === 'PENDING' || value === 'PAID' || value === 'OVERDUE') {
      return value;
    }

    warnings.add(`Status sugerido pela IA não reconhecido: "${value}". Usando pendente.`);
    return 'PENDING';
  }

  private normalizedPaymentMethod(
    value: string | null,
    warnings: Set<string>,
  ): PaymentMethod | null {
    if (!value) {
      return null;
    }

    const allowedMethods = new Set([
      'PIX',
      'CASH',
      'CREDIT_CARD',
      'DEBIT_CARD',
      'BANK_TRANSFER',
      'BOLETO',
      'CHECK',
      'OTHER',
    ]);

    if (allowedMethods.has(value)) {
      return value;
    }

    warnings.add(`Método de pagamento sugerido pela IA não reconhecido: "${value}".`);
    return null;
  }

  private focusQuickTransactionTextarea(): void {
    const textarea = this.document.getElementById('quick-transaction-text');

    if (textarea instanceof HTMLTextAreaElement) {
      textarea.focus();
    }
  }

  private handleParseError(error: unknown): void {
    const status = error instanceof HttpErrorResponse ? error.status : this.errorStatus(error);

    if (status === 403) {
      this.quickTransactionError.set('Você não tem permissão para usar a movimentação rápida.');
      return;
    }

    if (status === 422) {
      this.quickTransactionError.set(
        'Não foi possível interpretar o texto como movimentação. Tente informar valor, data e forma de pagamento.',
      );
      return;
    }

    this.quickTransactionError.set('Não foi possível interpretar a movimentação agora.');
  }

  private errorStatus(error: unknown): number | null {
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const status = Number((error as { status: unknown }).status);
      return Number.isFinite(status) ? status : null;
    }

    return null;
  }

  private reloadDashboardData(): void {
    this.reloadTrigger.update((value) => value + 1);
  }

  private trimmedQuickTransactionText(): string {
    return `${this.quickTransactionControl.value ?? ''}`.trim();
  }

  private currentDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private clearDashboardData(): void {
    this.summary.set(null);
    this.summaryLoading.set(false);
    this.summaryError.set(null);
    this.transactions.set([]);
    this.transactionsLoading.set(false);
    this.transactionsError.set(null);
    this.alerts.set(null);
    this.alertsLoading.set(false);
    this.alertsError.set(null);
    this.inProgressHarvests.set([]);
    this.harvestsLoading.set(false);
    this.harvestsError.set(null);
  }

  protected retryHarvests(): void {
    const farmId = this.selectedFarmStore.selectedFarmId();
    if (!farmId || this.harvestsLoading()) {
      return;
    }

    const subscriptions = new Subscription();
    this.destroyRef.onDestroy(() => subscriptions.unsubscribe());
    this.loadInProgressHarvests(farmId, subscriptions);
  }

  protected harvestStatusLabel(status: DashboardHarvestSeason["status"]): string {
    return status === "IN_PROGRESS" ? "Em andamento" : status;
  }

  protected formatHarvestCurrency(value: number | null | undefined): string {
    return this.formatCurrency(value ?? 0);
  }

  protected isNegativeHarvestProfit(value: number | null | undefined): boolean {
    return (value ?? 0) < 0;
  }

  protected harvestProfitClasses(value: number): string {
    if (value > 0) return "text-success";
    if (value < 0) return "text-danger";
    return "text-text-primary";
  }

  protected upcomingBillsTooltip(harvest: DashboardHarvestSeason): string {
    const { count, totalAmount } = harvest.dueNext7Days;
    if (count === 0) return "Nenhuma conta a pagar nos próximos 7 dias.";

    return this.accountCountLabel(count, "a pagar") + "\nTotal: " + this.formatHarvestCurrency(totalAmount) + "\nVencem entre hoje e os próximos 7 dias.";
  }

  protected overdueBillsTooltip(harvest: DashboardHarvestSeason): string {
    const { count, totalAmount } = harvest.overdue;
    if (count === 0) return "Nenhuma conta atrasada.";

    return this.accountCountLabel(count, "atrasada") + "\nTotal: " + this.formatHarvestCurrency(totalAmount);
  }

  private accountCountLabel(count: number, suffix: "a pagar" | "atrasada"): string {
    const account = count === 1 ? "conta" : "contas";
    return String(count) + " " + account + " " + suffix + (suffix === "atrasada" && count !== 1 ? "s" : "");
  }

  protected upcomingCountClasses(count: number): string {
    return count > 0
      ? "mt-1 text-lg font-semibold text-amber-700 dark:text-amber-300"
      : "mt-1 text-lg font-semibold text-text-primary";
  }

  protected upcomingIndicatorClasses(count: number): string {
    return count > 0
      ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
      : "bg-background";
  }

  protected overdueCountClasses(count: number): string {
    return count > 0
      ? "mt-1 text-lg font-semibold text-danger"
      : "mt-1 text-lg font-semibold text-text-primary";
  }

  protected overdueIndicatorClasses(count: number): string {
    return count > 0
      ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
      : "bg-background";
  }

  private formatCurrency(value: number): string {
    return this.currencyPipe.transform(value);
  }
}
