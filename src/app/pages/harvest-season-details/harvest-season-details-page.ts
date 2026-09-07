import { NgTemplateOutlet } from '@angular/common';
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
  HarvestSeasonBudget,
  HarvestSeasonBudgetCategory,
  HarvestSeasonBudgetItem,
  HarvestSeasonBudgetItemRequest,
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
import { FinancialCategoryService } from '../../core/services/financial-category.service';
import { FinancialCategory } from '../../core/models/financial-category.models';
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
  areaHectares: GdFormControl;
}

interface BudgetItemFormControls {
  categoryId: GdFormControl;
  description: GdFormControl;
  plannedAmount: GdFormControl;
}

interface DetailSummaryCard {
  title: string;
  value: string;
  description: string;
  detail?: string;
  icon: string;
  tone: SummaryCardTone;
}

interface DetailSummaryGroup {
  title: string;
  gridClasses: string;
  cards: readonly DetailSummaryCard[];
}

type HarvestDetailTab = 'overview' | 'planning';

interface BudgetSection {
  title: string;
  total: number;
  groups: readonly HarvestSeasonBudgetCategory[];
  type: 'INCOME' | 'EXPENSE';
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
  action: 'activate' | 'finish' | 'inactivate' | 'reopen';
}

interface StatusTarget {
  harvest: HarvestSeason;
  action: StatusConfirmation['action'];
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
    NgTemplateOutlet,
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
  private readonly categoryService = inject(FinancialCategoryService);
  private readonly productionActivityService = inject(ProductionActivityService);
  private readonly toastStore = inject(ToastStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly farmAccessStore = inject(FarmAccessStore);
  protected readonly sessionStore = inject(SessionStore);

  protected readonly harvest = signal<HarvestSeason | null>(null);
  protected readonly summary = signal<HarvestSeasonDetailSummary | null>(null);
  protected readonly budget = signal<HarvestSeasonBudget | null>(null);
  protected readonly transactionsPage = signal<PageResponse<FinancialTransaction> | null>(null);
  protected readonly productionActivities = signal<ProductionActivity[]>([]);
  protected readonly loadingHarvest = signal(false);
  protected readonly harvestError = signal<string | null>(null);
  protected readonly summaryLoading = signal(false);
  protected readonly summaryError = signal<string | null>(null);
  protected readonly budgetLoading = signal(false);
  protected readonly budgetError = signal<string | null>(null);
  protected readonly budgetDrawerOpen = signal(false);
  protected readonly editingBudgetItem = signal<HarvestSeasonBudgetItem | null>(null);
  protected readonly budgetItemType = signal<'INCOME' | 'EXPENSE'>('EXPENSE');
  protected readonly budgetCategories = signal<FinancialCategory[]>([]);
  protected readonly budgetSubmitting = signal(false);
  protected readonly budgetDeleteTarget = signal<HarvestSeasonBudgetItem | null>(null);
  protected readonly budgetDeleting = signal(false);
  protected readonly transactionsLoading = signal(false);
  protected readonly transactionsError = signal<string | null>(null);
  protected readonly drawerOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly statusTarget = signal<StatusTarget | null>(null);
  protected readonly statusSubmitting = signal(false);
  protected readonly indicatorsDrawerOpen = signal(false);
  protected readonly activeTab = signal<HarvestDetailTab>('overview');
  protected readonly skeletons = Array.from({ length: 15 }, (_, index) => index + 1);

  private readonly harvestId = signal<number | null>(null);

  protected readonly form = new FormGroup<HarvestFormControls>(
    {
      productionActivityId: new FormControl<GdFormValue>('', { validators: [Validators.required] }),
      name: new FormControl<GdFormValue>('', { validators: [Validators.required] }),
      description: new FormControl<GdFormValue>('', { validators: [Validators.maxLength(500)] }),
      startDate: new FormControl<GdFormValue>('', { validators: [Validators.required] }),
      endDate: new FormControl<GdFormValue>(''),
      areaHectares: new FormControl<GdFormValue>(''),
    },
    { validators: [this.dateRangeValidator()] },
  );

  protected readonly budgetForm = new FormGroup<BudgetItemFormControls>({
    categoryId: new FormControl<GdFormValue>('', { validators: [Validators.required] }),
    description: new FormControl<GdFormValue>('', {
      validators: [Validators.required, Validators.maxLength(500)],
    }),
    plannedAmount: new FormControl<GdFormValue>('', { validators: [Validators.required] }),
  });

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
  protected readonly canManageBudget = computed(() => {
    const status = this.harvest()?.status;
    return this.canManageHarvests() && (status === 'PLANNED' || status === 'IN_PROGRESS');
  });
  protected readonly budgetCategoryOptions = computed<readonly GdSelectOption[]>(() =>
    this.budgetCategories()
      .filter((category) => category.status === 'ACTIVE')
      .map((category) => ({ label: category.name, value: category.id })),
  );
  protected readonly budgetDrawerTitle = computed(() => {
    const action = this.editingBudgetItem() ? 'Editar' : 'Adicionar';
    const type = this.budgetItemType() === 'EXPENSE' ? 'despesa' : 'receita';
    return `${action} ${type} planejada`;
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
      this.marginCard('Margem planejada', planning.plannedMargin, 'Percentual do resultado sobre a receita planejada.'),
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
      this.marginCard('Margem realizada', realized.realizedMargin, 'Percentual do resultado sobre a receita realizada.'),
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
        'Resultado estimado ao final da safra, considerando realizado e compromissos em aberto.',
        'chart-no-axes-combined',
      ),
      this.marginCard('Margem projetada', projection.projectedMargin, 'Percentual do resultado projetado sobre a receita projetada.'),
      {
        title: 'Desempenho do lucro',
        value: this.percentageLabel(comparison.profitPerformancePercentage),
        description: 'Compara o lucro projetado, com realizado e compromissos em aberto, ao orçamento da safra.',
        detail: this.comparisonStatusLabel(comparison.profitPerformanceStatus),
        icon: 'chart-no-axes-column-increasing',
        tone: this.profitPerformanceTone(comparison.profitPerformanceStatus),
      },
      {
        title: 'Desvio de custo',
        value: this.currencyLabel(comparison.costVarianceAmount),
        description: 'Diferença entre o custo projetado, com realizado e compromissos em aberto, e o orçamento da safra.',
        detail: this.comparisonStatusLabel(
          comparison.costVarianceStatus,
          comparison.costVariancePercentage,
        ),
        icon: 'chart-spline',
        tone: this.costVarianceTone(comparison.costVarianceStatus),
      },
      this.moneyCard(
        'A pagar',
        openAmounts.payableAmount,
        'Total de contas em aberto a pagar.',
        'calendar-clock',
        'warning',
      ),
      this.moneyCard(
        'A receber',
        openAmounts.receivableAmount,
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
  protected readonly financialSummaryGroups = computed<readonly DetailSummaryGroup[]>(() => {
    const cards = this.summaryCards();

    return [
      this.summaryGroup(
        'Planejamento',
        'grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4',
        cards,
        ['Custo planejado', 'Receita planejada', 'Lucro planejado', 'Margem planejada'],
      ),
      this.summaryGroup(
        'Realizado',
        'grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4',
        cards,
        ['Custo realizado', 'Receita realizada', 'Lucro realizado', 'Margem realizada'],
      ),
      this.summaryGroup(
        'Projeção',
        'grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4',
        cards,
        ['Custo projetado', 'Receita projetada', 'Lucro projetado', 'Margem projetada'],
      ),
      this.summaryGroup(
        'Comparação',
        'grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2',
        cards,
        ['Desempenho do lucro', 'Desvio de custo'],
      ),
      this.summaryGroup(
        'Compromissos',
        'grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4',
        cards,
        ['A pagar', 'A receber', 'Vencidas a pagar', 'Vencidas a receber'],
      ),
    ];
  });
  protected readonly consolidatedSummaryGroups = computed(() =>
    [{
      title: 'Resumo financeiro',
      gridClasses: 'grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4',
      cards: this.mainSummaryCards(),
    }],
  );
  protected readonly mainSummaryCards = computed<readonly DetailSummaryCard[]>(() => {
    const cards = this.summaryCards();
    const status = this.harvest()?.status;

    if (status === 'PLANNED') {
      return this.cardsByTitle(cards, [
        'Custo planejado',
        'Receita planejada',
        'Lucro planejado',
        'Margem planejada',
      ]);
    }

    if (status === 'IN_PROGRESS') {
      return this.cardsByTitle(cards, [
        'Custo projetado',
        'Receita projetada',
        'Lucro projetado',
        'Desvio de custo',
      ]);
    }

    return this.cardsByTitle(cards, [
      'Custo realizado',
      'Receita realizada',
      'Lucro realizado',
      'Margem realizada',
    ]);
  });
  protected readonly planningCards = computed<readonly DetailSummaryCard[]>(() => {
    const budget = this.budget();

    if (!budget) {
      return [];
    }

    return [
      this.currencyCard(
        'Despesas planejadas',
        budget.plannedExpense,
        'Total de despesas previstas para a safra.',
        'briefcase-business',
        'warning',
      ),
      this.currencyCard(
        'Receitas planejadas',
        budget.plannedRevenue,
        'Total de receitas previstas para a safra.',
        'trending-up',
        'success',
      ),
      this.profitCard(
        'Resultado planejado',
        budget.plannedResult,
        'Resultado entre receitas e despesas previstas.',
        'chart-no-axes-combined',
      ),
      {
        title: 'Margem planejada',
        value: this.percentageLabel(budget.plannedMargin),
        description: 'Margem do resultado planejado sobre as receitas previstas.',
        icon: 'chart-no-axes-column-increasing',
        tone: this.profitTone(budget.plannedMargin),
      },
    ];
  });
  protected readonly budgetSections = computed<readonly BudgetSection[]>(() => {
    const budget = this.budget();

    if (!budget) {
      return [];
    }

    return [
      {
        title: 'Despesas planejadas',
        total: budget.plannedExpense,
        groups: budget.expenses,
        type: 'EXPENSE',
      },
      {
        title: 'Receitas planejadas',
        total: budget.plannedRevenue,
        groups: budget.incomes,
        type: 'INCOME',
      },
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
      { label: 'Criado em', value: harvest.createdAt ? this.dateLabel(harvest.createdAt) : '—' },
      {
        label: 'Atualizado em',
        value: harvest.updatedAt ? this.dateLabel(harvest.updatedAt) : '—',
      },
    ];
  });
  protected readonly statusConfirmation = computed<StatusConfirmation>(() => {
    const action = this.statusTarget()?.action;

    if (action === 'finish') {
      return {
        title: 'Finalizar safra?',
        description: 'Tem certeza que deseja finalizar esta safra?',
        confirmLabel: 'Finalizar safra',
        variant: 'warning',
        action,
      };
    }

    if (action === 'reopen') {
      return {
        title: 'Reabrir safra?',
        description: 'Esta safra voltará para o status Em andamento.',
        confirmLabel: 'Reabrir safra',
        variant: 'info',
        action,
      };
    }

    if (action === 'activate') {
      return {
        title: 'Reativar safra?',
        description: 'Esta safra voltará para o status Planejada.',
        confirmLabel: 'Reativar safra',
        variant: 'info',
        action,
      };
    }

    return {
      title: 'Inativar safra?',
      description:
        'Esta safra deixará de ficar disponível para novas operações, mas os registros existentes serão preservados.',
      confirmLabel: 'Inativar safra',
      variant: 'warning',
      action: 'inactivate',
    };
  });

  ngOnInit(): void {

    this.bindMoneySanitizer(this.budgetForm.controls.plannedAmount);

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

  protected selectTab(tab: HarvestDetailTab): void {
    this.activeTab.set(tab);
  }

  protected openIndicatorsDrawer(): void {
    this.indicatorsDrawerOpen.set(true);
  }

  protected closeIndicatorsDrawer(): void {
    this.indicatorsDrawerOpen.set(false);
  }

  protected goToTransactions(): void {
    const harvest = this.harvest();

    if (harvest) {
      void this.router.navigate(['/transactions'], { queryParams: { harvestSeasonId: harvest.id } });
    }
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

  protected retryBudget(): void {
    const id = this.harvestId();

    if (id) {
      this.loadBudget(id);
    }
  }

  protected openCreateBudgetItem(type: 'INCOME' | 'EXPENSE'): void {
    if (!this.canManageBudget()) {
      this.showPermissionError();
      return;
    }

    this.editingBudgetItem.set(null);
    this.budgetItemType.set(type);
    this.budgetForm.reset({ categoryId: '', description: '', plannedAmount: '' });
    this.loadBudgetCategories(type);
    this.budgetDrawerOpen.set(true);
  }

  protected openEditBudgetItem(item: HarvestSeasonBudgetItem): void {
    if (!this.canManageBudget()) {
      this.showPermissionError();
      return;
    }

    this.editingBudgetItem.set(item);
    this.budgetItemType.set(item.type);
    this.budgetForm.reset({
      categoryId: item.categoryId ?? '',
      description: item.description,
      plannedAmount: numberToBrazilianMoney(item.plannedAmount),
    });
    this.loadBudgetCategories(item.type);
    this.budgetDrawerOpen.set(true);
  }

  protected closeBudgetDrawer(): void {
    if (!this.budgetSubmitting()) {
      this.budgetDrawerOpen.set(false);
    }
  }

  protected saveBudgetItem(): void {
    const harvest = this.harvest();

    if (!harvest || !this.canManageBudget() || this.budgetSubmitting()) {
      return;
    }

    this.validateBudgetAmount();

    if (this.budgetForm.invalid) {
      this.budgetForm.markAllAsTouched();
      return;
    }

    const categoryId = this.numberValue(this.budgetForm.controls.categoryId.value);
    const description = this.stringValue(this.budgetForm.controls.description.value);
    const plannedAmount = this.moneyValue(this.budgetForm.controls.plannedAmount.value);

    if (categoryId === null || !description || plannedAmount === null || plannedAmount <= 0) {
      this.budgetForm.markAllAsTouched();
      return;
    }

    const payload: HarvestSeasonBudgetItemRequest = {
      categoryId,
      type: this.budgetItemType(),
      description,
      plannedAmount,
    };
    const editingItem = this.editingBudgetItem();
    const request$ = editingItem
      ? this.harvestService.updateBudgetItem(harvest.id, editingItem.id, payload)
      : this.harvestService.createBudgetItem(harvest.id, payload);

    this.budgetSubmitting.set(true);
    request$
      .pipe(
        finalize(() => this.budgetSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.budgetDrawerOpen.set(false);
          this.toastStore.success(
            editingItem
              ? 'Item do planejamento atualizado com sucesso.'
              : 'Item adicionado ao planejamento com sucesso.',
          );
          this.refreshBudget(harvest.id);
        },
        error: (error: unknown) => this.showBudgetOperationError(error),
      });
  }

  protected requestDeleteBudgetItem(item: HarvestSeasonBudgetItem): void {
    if (!this.canManageBudget()) {
      this.showPermissionError();
      return;
    }

    this.budgetDeleteTarget.set(item);
  }

  protected closeBudgetDeleteConfirmation(): void {
    if (!this.budgetDeleting()) {
      this.budgetDeleteTarget.set(null);
    }
  }

  protected confirmDeleteBudgetItem(): void {
    const harvest = this.harvest();
    const item = this.budgetDeleteTarget();

    if (!harvest || !item || this.budgetDeleting()) {
      return;
    }

    this.budgetDeleting.set(true);
    this.harvestService
      .deleteBudgetItem(harvest.id, item.id)
      .pipe(
        finalize(() => this.budgetDeleting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.budgetDeleteTarget.set(null);
          this.toastStore.success('Item removido do planejamento com sucesso.');
          this.refreshBudget(harvest.id);
        },
        error: (error: unknown) => this.showBudgetOperationError(error),
      });
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

  protected requestLifecycleChange(): void {
    const harvest = this.harvest();

    if (!harvest) {
      return;
    }

    if (!this.canManageHarvests()) {
      this.showPermissionError();
      return;
    }

    if (harvest.status === 'PLANNED') {
      this.changeStatus(harvest, 'IN_PROGRESS', 'Safra iniciada com sucesso.');
      return;
    }

    const action: StatusConfirmation['action'] =
      harvest.status === 'IN_PROGRESS'
        ? 'finish'
        : harvest.status === 'FINISHED'
          ? 'reopen'
          : 'activate';
    this.statusTarget.set({ harvest, action });
  }

  protected requestInactivation(): void {
    const harvest = this.harvest();

    if (!harvest) {
      return;
    }

    if (!this.canManageHarvests()) {
      this.showPermissionError();
      return;
    }

    this.statusTarget.set({ harvest, action: 'inactivate' });
  }

  protected closeStatusConfirmation(): void {
    if (!this.statusSubmitting()) {
      this.statusTarget.set(null);
    }
  }

  protected confirmStatusChange(): void {
    const target = this.statusTarget();

    if (!target || this.statusSubmitting()) {
      return;
    }

    const confirmation = this.statusConfirmation();
    const { harvest } = target;
    const request$: Observable<unknown> =
      confirmation.action === 'activate'
        ? this.harvestService.activate(harvest.id)
        : confirmation.action === 'inactivate'
          ? this.harvestService.inactivate(harvest.id)
          : this.harvestService.updateStatus(
              harvest.id,
              confirmation.action === 'finish' ? 'FINISHED' : 'IN_PROGRESS',
            );

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
            this.statusSuccessMessage(confirmation.action),
          );
          this.loadDetails(harvest.id);
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  protected statusActionDescription(status: HarvestSeasonStatus): string {
    const descriptions: Record<HarvestSeasonStatus, string> = {
      PLANNED: 'Inicie a safra quando as atividades produtivas começarem.',
      IN_PROGRESS: 'Finalize a safra quando o ciclo produtivo for concluído.',
      FINISHED: 'Reabra a safra caso o ciclo produtivo precise continuar.',
      INACTIVE: 'Reative a safra para retorná-la ao status Planejada.',
    };

    return descriptions[status];
  }

  protected statusActionLabel(status: HarvestSeasonStatus): string {
    const labels: Record<HarvestSeasonStatus, string> = {
      PLANNED: 'Iniciar safra',
      IN_PROGRESS: 'Finalizar safra',
      FINISHED: 'Reabrir safra',
      INACTIVE: 'Reativar safra',
    };

    return labels[status];
  }

  protected statusLabel(status: HarvestSeasonStatus): string {
    const labels: Record<HarvestSeasonStatus, string> = {
      PLANNED: 'Planejada',
      IN_PROGRESS: 'Em andamento',
      FINISHED: 'Finalizada',
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

  private changeStatus(
    harvest: HarvestSeason,
    status: HarvestSeasonStatus,
    successMessage: string,
  ): void {
    this.statusSubmitting.set(true);

    this.harvestService
      .updateStatus(harvest.id, status)
      .pipe(
        finalize(() => this.statusSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.drawerOpen.set(false);
          this.toastStore.success(successMessage);
          this.loadDetails(harvest.id);
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  private statusSuccessMessage(action: StatusConfirmation['action']): string {
    const messages: Record<StatusConfirmation['action'], string> = {
      activate: 'Safra reativada com sucesso.',
      finish: 'Safra finalizada com sucesso.',
      inactivate: 'Safra inativada com sucesso.',
      reopen: 'Safra reaberta com sucesso.',
    };

    return messages[action];
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

  private marginCard(title: string, margin: number, description: string): DetailSummaryCard {
    return {
      title,
      value: this.percentageLabel(margin),
      description,
      icon: 'chart-no-axes-combined',
      tone: this.profitTone(margin),
    };
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

  private summaryGroup(
    title: string,
    gridClasses: string,
    cards: readonly DetailSummaryCard[],
    titles: readonly string[],
  ): DetailSummaryGroup {
    return {
      title,
      gridClasses,
      cards: cards.filter((card) => titles.includes(card.title)),
    };
  }

  private cardsByTitle(
    cards: readonly DetailSummaryCard[],
    titles: readonly string[],
  ): readonly DetailSummaryCard[] {
    return cards.filter((card) => titles.includes(card.title));
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

  protected budgetFieldError(controlName: keyof BudgetItemFormControls): string | null {
    const control = this.budgetForm.controls[controlName];

    if (control.hasError('required')) {
      return 'Campo obrigatório.';
    }

    if (control.hasError('positive')) {
      return 'Informe um valor maior que zero.';
    }

    if (control.hasError('maxlength')) {
      return 'Informe no máximo 500 caracteres.';
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
    this.loadBudget(id);

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

  private loadBudget(id: number): void {
    this.budgetLoading.set(true);
    this.budgetError.set(null);

    this.harvestService
      .getBudgetItems(id)
      .pipe(
        finalize(() => this.budgetLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (budget) => this.budget.set(budget),
        error: () => {
          this.budget.set(null);
          this.budgetError.set('Não foi possível carregar o planejamento financeiro.');
        },
      });
  }

  private refreshBudget(id: number): void {
    this.loadBudget(id);
    this.loadSummary(id);
  }

  private loadBudgetCategories(type: 'INCOME' | 'EXPENSE'): void {
    const harvest = this.harvest();

    if (!harvest) {
      this.budgetCategories.set([]);
      return;
    }

    this.categoryService
      .listByFarm(harvest.farmId, {
        includeInactive: false,
        type,
        page: 0,
        size: 100,
        sort: 'name',
        direction: 'ASC',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => this.budgetCategories.set(categories),
        error: () => this.budgetCategories.set([]),
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

  private showBudgetOperationError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 400) {
      this.toastStore.error('Verifique categoria, descrição e valor planejado.');
      return;
    }

    this.showOperationError(error);
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
    this.validateNonNegativeNumber(this.form.controls.areaHectares);
  }

  private validateBudgetAmount(): void {
    const amount = this.moneyValue(this.budgetForm.controls.plannedAmount.value);
    this.setControlError(
      this.budgetForm.controls.plannedAmount,
      'positive',
      amount === null || amount <= 0,
    );
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
