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
import { HttpResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import {
  FinancialReportBasis,
  FinancialCategorySummaryGroup,
  FinancialPlanningIndicators,
  FinancialReportGranularity,
  FinancialReportResponse,
  FinancialReportTransaction,
  FinancialEvolutionPoint,
} from '../../../core/models/financial-report.models';
import { PageResponse } from '../../../core/models/page-response.model';
import { FinancialCategoryService } from '../../../core/services/financial-category.service';
import { FinancialService } from '../../../core/services/financial.service';
import { HarvestSeasonService } from '../../../core/services/harvest-season.service';
import { FarmAccessStore } from '../../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../../core/stores/selected-farm.store';
import { SessionStore } from '../../../core/stores/session.store';
import { ToastStore } from '../../../core/stores/toast.store';
import { GdFormControl, GdFormValue, GdSelectOption, Input, Select } from '../../../shared/forms';
import { BrCurrencyPipe } from '../../../shared/pipes/br-currency.pipe';
import {
  Badge,
  BadgeVariant,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  SummaryCard,
  Tooltip,
} from '../../../shared/ui';
import { Drawer } from '../../../shared/overlays';
import { FinancialEvolutionChart } from './components/financial-evolution-chart/financial-evolution-chart';
import { FinancialCashFlowChart } from './components/financial-cash-flow-chart/financial-cash-flow-chart';
import { FinancialIncomeExpenseChart } from './components/financial-income-expense-chart/financial-income-expense-chart';

interface AppliedReportFilters {
  startDate: string;
  endDate: string;
  basis: FinancialReportBasis;
  harvestSeasonId: number | null;
  categoryId: number | null;
}

interface FinancialSummaryCard {
  title: string;
  value: string;
  description: string;
  icon: string;
  meta?: string;
  tone: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
}

interface FinancialSummaryGroup {
  title: string;
  gridClasses: string;
  cards: readonly FinancialSummaryCard[];
}

const DEFAULT_FILTERS: AppliedReportFilters = {
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  basis: 'CASH' as FinancialReportBasis,
  harvestSeasonId: null,
  categoryId: null,
};
const percentageFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

@Component({
  selector: 'gd-financial-report-page',
  imports: [
    Badge,
    Button,
    Card,
    EmptyState,
    ErrorState,
    Drawer,
    FinancialEvolutionChart,
    FinancialCashFlowChart,
    FinancialIncomeExpenseChart,
    Input,
    LucideDynamicIcon,
    ReactiveFormsModule,
    NgTemplateOutlet,
    Select,
    Skeleton,
    SummaryCard,
    Tooltip,
  ],
  templateUrl: './financial-report-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialReportPage {
  private readonly financialService = inject(FinancialService);
  private readonly harvestService = inject(HarvestSeasonService);
  private readonly categoryService = inject(FinancialCategoryService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly farmAccessStore = inject(FarmAccessStore);
  protected readonly sessionStore = inject(SessionStore);
  private readonly toastStore = inject(ToastStore);
  private currentFarmId: number | null = null;
  private readonly reload = signal(0);
  private readonly currencyPipe = new BrCurrencyPipe();
  private readonly dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
  private readonly periodFormatter = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  private readonly indicatorGridClasses =
    'grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4';

  readonly report = signal<FinancialReportResponse | null>(null);
  readonly reportLoading = signal(false);
  protected readonly exportingPdf = signal(false);
  protected readonly indicatorsDrawerOpen = signal(false);
  readonly reportError = signal<string | null>(null);
  readonly selectedPeriod = signal<FinancialEvolutionPoint | null>(null);
  protected readonly evolutionGranularity = signal<FinancialReportGranularity>('MONTHLY');
  protected readonly categorySummaryType = signal<'EXPENSE' | 'INCOME'>('EXPENSE');
  readonly transactions = signal<readonly FinancialReportTransaction[]>([]);
  readonly transactionsLoading = signal(false);
  readonly transactionsError = signal<string | null>(null);
  protected readonly transactionPage = signal<PageResponse<FinancialReportTransaction> | null>(
    null,
  );
  protected readonly harvestOptions = signal<readonly GdSelectOption[]>([]);
  protected readonly categoryOptions = signal<readonly GdSelectOption[]>([]);
  protected readonly filterForm = new FormGroup({
    startDate: new FormControl<GdFormValue>(DEFAULT_FILTERS.startDate, {
      validators: [Validators.required],
    }),
    endDate: new FormControl<GdFormValue>(DEFAULT_FILTERS.endDate, {
      validators: [Validators.required],
    }),
    basis: new FormControl<GdFormValue>(DEFAULT_FILTERS.basis),
    harvestSeasonId: new FormControl<GdFormValue>(''),
    categoryId: new FormControl<GdFormValue>(''),
  }, { validators: [this.reportPeriodValidator()] });
  protected readonly basisOptions: readonly GdSelectOption[] = [
    { label: 'Regime de caixa', value: 'CASH' },
    { label: 'Regime de competência', value: 'ACCRUAL' },
  ];
  protected readonly basisTooltip = [
    'Regime de caixa:',
    'Para itens pagos, considera a data de pagamento ou recebimento; para pendentes e vencidos, a data de vencimento.',
    '',
    'Regime de competência:',
    'Considera a data em que a movimentação foi registrada.',
  ].join('\n');
  private readonly appliedFilters = signal(DEFAULT_FILTERS);
  protected readonly canViewReport = computed(
    () =>
      this.sessionStore.isAdmin() ||
      (this.selectedFarmStore.selectedFarmId() !== null &&
        this.farmAccessStore.access()?.farmId === this.selectedFarmStore.selectedFarmId() &&
        this.farmAccessStore.canViewFinancial()),
  );
  protected readonly hasReportData = computed(() => {
    const report = this.report();
    return (
      !!report &&
      (report.summary.totalIncome !== 0 ||
        report.summary.totalExpense !== 0 ||
        report.evolution.some((point) => point.transactionCount > 0) ||
        report.unallocated.transactionCount > 0)
    );
  });
  protected readonly canExportPdf = computed(
    () =>
      this.selectedFarmStore.selectedFarmId() !== null &&
      this.canViewReport() &&
      !this.reportLoading() &&
      !this.exportingPdf() &&
      !this.reportError(),
  );
  protected readonly movementsPeriod = computed(() => {
    const period = this.selectedPeriod();
    return period ? this.periodFormatter.format(this.utcDate(period.periodStart)) : null;
  });
  protected readonly selectedCategorySummary = computed<FinancialCategorySummaryGroup | null>(() =>
    this.report()?.categories.find((group) => group.type === this.categorySummaryType()) ?? null,
  );
  protected readonly primaryIndicatorCards = computed<readonly FinancialSummaryCard[]>(() => {
    const indicators = this.report()?.financialIndicators;
    if (!indicators) return [];

    return [
      this.currencyCard(
        'Resultado projetado',
        indicators.result.projectedResult,
        'Receitas totais menos despesas totais no período selecionado.',
        'chart-no-axes-combined',
      ),
      {
        title: 'Margem',
        value: this.formatNullablePercentage(indicators.result.marginPercentage),
        description: 'Resultado projetado em relação às receitas totais.',
        icon: 'chart-no-axes-combined',
        tone:
          indicators.result.marginPercentage === null
            ? 'neutral'
            : this.signedValueTone(indicators.result.marginPercentage),
      },
      {
        title: 'Receitas realizadas',
        value: this.formatCurrency(indicators.result.realizedIncome),
        description: 'Receitas efetivamente recebidas até a data de corte.',
        icon: 'circle-check',
        tone: 'success',
      },
      {
        title: 'Despesas realizadas',
        value: this.formatCurrency(indicators.result.realizedExpense),
        description: 'Despesas efetivamente pagas até a data de corte.',
        icon: 'circle-check',
        tone: 'danger',
      },
    ];
  });
  protected readonly financialSummaryGroups = computed<readonly FinancialSummaryGroup[]>(() => {
    const report = this.report();
    if (!report) return [];

    const indicators = report.financialIndicators;
    const result = indicators.result;
    const liquidity = indicators.liquidity;
    const efficiency = indicators.efficiency;
    const groups: FinancialSummaryGroup[] = [
      {
        title: 'Resultado',
        gridClasses: this.indicatorGridClasses,
        cards: [
          this.currencyCard('Receitas totais', result.totalIncome, 'Receitas realizadas e em aberto.', 'trending-up', 'success'),
          this.currencyCard('Despesas totais', result.totalExpense, 'Despesas realizadas e em aberto.', 'trending-down', 'danger'),
          this.currencyCard('Resultado projetado', result.projectedResult, 'Receitas totais menos despesas totais.', 'wallet'),
          this.percentageCard('Margem', result.marginPercentage, 'Resultado projetado em relação às receitas totais.'),
          this.currencyCard('Receitas realizadas', result.realizedIncome, 'Receitas efetivamente recebidas.', 'circle-check', 'success'),
          this.currencyCard('Despesas realizadas', result.realizedExpense, 'Despesas efetivamente pagas.', 'circle-check', 'danger'),
          this.currencyCard('Resultado realizado', result.realizedResult, 'Receitas realizadas menos despesas realizadas.', 'chart-no-axes-combined'),
        ],
      },
      {
        title: 'Liquidez e compromissos',
        gridClasses: this.indicatorGridClasses,
        cards: [
          this.currencyCard('Contas a receber', liquidity.accountsReceivable, 'Saldo em aberto a receber nos filtros selecionados.', 'circle-dollar-sign', 'success'),
          this.currencyCard('Contas a pagar', liquidity.accountsPayable, 'Saldo em aberto a pagar nos filtros selecionados.', 'receipt-text', 'danger'),
          this.currencyCard('Vencidos a receber', liquidity.overdueReceivable, 'Contas a receber abertas e vencidas.', 'triangle-alert', 'warning'),
          this.currencyCard('Vencidos a pagar', liquidity.overduePayable, 'Contas a pagar abertas e vencidas.', 'triangle-alert', 'danger'),
          this.percentageCard('Cobertura financeira', liquidity.coveragePercentage, 'Recursos disponíveis em relação às obrigações.', 'shield-check'),
          this.currencyCard('Necessidade de caixa', liquidity.cashNeed, 'Obrigações menos recursos disponíveis.', 'wallet'),
        ],
      },
      {
        title: 'Eficiência',
        gridClasses: this.indicatorGridClasses,
        cards: [
          this.percentageCard('Custo sobre receita', efficiency.costToIncomePercentage, 'Despesas totais em relação às receitas totais.'),
          this.percentageCard('Retorno sobre custos', efficiency.returnOnCostsPercentage, 'Resultado realizado em relação às despesas realizadas.'),
        ],
      },
    ];

    if (indicators.ruralManagement) {
      groups.push({
        title: 'Gestão rural',
        gridClasses: this.indicatorGridClasses,
        cards: [
          this.currencyCard('Receita por hectare', indicators.ruralManagement.incomePerHectare, `Área considerada: ${this.formatNumber(indicators.ruralManagement.areaHectares)} ha.`, 'sprout', 'success'),
          this.currencyCard('Custo por hectare', indicators.ruralManagement.costPerHectare, `Área considerada: ${this.formatNumber(indicators.ruralManagement.areaHectares)} ha.`, 'sprout', 'danger'),
          this.currencyCard('Resultado por hectare', indicators.ruralManagement.resultPerHectare, `Área considerada: ${this.formatNumber(indicators.ruralManagement.areaHectares)} ha.`, 'sprout'),
        ],
      });
    }

    groups.push(this.planningGroup(indicators.planning));
    groups.push(this.highlightsGroup(report));
    return groups;
  });

  constructor() {
    effect((onCleanup) => {
      const farmId = this.selectedFarmStore.selectedFarmId();
      this.reload();
      if (this.currentFarmId !== farmId) {
        this.currentFarmId = farmId;
        this.resetForFarmChange();
      }
      if (!farmId || !this.canViewReport()) return;
      this.reportLoading.set(true);
      this.reportError.set(null);
      this.report.set(null);
      const subscription = this.financialService
        .getFinancialReport(this.request(farmId))
        .pipe(finalize(() => this.reportLoading.set(false)))
        .subscribe({
          next: (report) => {
            this.report.set(report);
            const period = report.evolution.find((item) => item.transactionCount > 0) ?? null;
            this.selectedPeriod.set(period);
            if (period) this.loadTransactions(period, 0);
          },
          error: () => {
            this.report.set(null);
            this.reportError.set('Não foi possível carregar o relatório financeiro.');
          },
        });
      onCleanup(() => subscription.unsubscribe());
    });
    effect((onCleanup) => {
      const farmId = this.selectedFarmStore.selectedFarmId();
      if (!farmId) return;
      const subscription = forkJoin({
        harvests: this.harvestService.list({ farmId, includeInactive: false, size: 100 }),
        categories: this.categoryService.listUsedInTransactions(farmId),
      })
        .pipe(catchError(() => of({ harvests: { content: [] }, categories: [] })))
        .subscribe(({ harvests, categories }) => {
          this.harvestOptions.set(
            harvests.content.map((item) => ({ label: item.name, value: item.id })),
          );
          this.categoryOptions.set(
            categories.map((item) => ({ label: item.name, value: item.id })),
          );
        });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected applyFilters(): void {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }

    const value = this.filterForm.getRawValue();
    const startDate = this.stringValue(value.startDate, DEFAULT_FILTERS.startDate);
    const endDate = this.stringValue(value.endDate, DEFAULT_FILTERS.endDate);
    this.appliedFilters.set({
      startDate,
      endDate,
      basis: value.basis === 'ACCRUAL' ? 'ACCRUAL' : 'CASH',
      harvestSeasonId: this.optionId(value.harvestSeasonId),
      categoryId: this.optionId(value.categoryId),
    });
    this.reload.update((value) => value + 1);
  }
  protected resetFilters(): void {
    this.filterForm.reset({
      startDate: DEFAULT_FILTERS.startDate,
      endDate: DEFAULT_FILTERS.endDate,
      basis: DEFAULT_FILTERS.basis,
      harvestSeasonId: '',
      categoryId: '',
    });
    this.appliedFilters.set(DEFAULT_FILTERS);
    this.reload.update((value) => value + 1);
  }
  protected retry(): void {
    this.reload.update((value) => value + 1);
  }
  protected exportPdf(): void {
    const farmId = this.selectedFarmStore.selectedFarmId();
    if (!farmId || !this.canExportPdf()) {
      return;
    }

    const pdfWindow = window.open('', '_blank');
    this.exportingPdf.set(true);
    this.financialService
      .exportFinancialReportPdf(this.request(farmId))
      .pipe(
        finalize(() => this.exportingPdf.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.openPdf(response, pdfWindow),
        error: () => {
          pdfWindow?.close();
          this.toastStore.error('Não foi possível gerar o relatório em PDF.');
        },
      });
  }
  protected openIndicatorsDrawer(): void {
    this.indicatorsDrawerOpen.set(true);
  }
  protected closeIndicatorsDrawer(): void {
    this.indicatorsDrawerOpen.set(false);
  }
  protected selectEvolutionPeriod(point: FinancialEvolutionPoint): void {
    this.selectedPeriod.set(point);
    this.loadTransactions(point, 0);
  }
  protected selectEvolutionGranularity(granularity: FinancialReportGranularity): void {
    if (this.evolutionGranularity() === granularity) return;
    this.evolutionGranularity.set(granularity);
    this.selectedPeriod.set(null);
    this.transactions.set([]);
    this.transactionPage.set(null);
    this.reload.update((value) => value + 1);
  }
  protected selectCategorySummaryType(type: 'EXPENSE' | 'INCOME'): void {
    this.categorySummaryType.set(type);
  }
  protected previousTransactionsPage(): void {
    const page = this.transactionPage();
    const period = this.selectedPeriod();
    if (page && period && !page.first) this.loadTransactions(period, page.page - 1);
  }
  protected nextTransactionsPage(): void {
    const page = this.transactionPage();
    const period = this.selectedPeriod();
    if (page && period && !page.last) this.loadTransactions(period, page.page + 1);
  }
  protected control(
    name: 'startDate' | 'endDate' | 'basis' | 'harvestSeasonId' | 'categoryId',
  ): GdFormControl {
    return this.filterForm.controls[name];
  }
  protected formatCurrency(value: number): string {
    return this.currencyPipe.transform(value);
  }
  protected formatDate(value: string): string {
    return this.dateFormatter.format(this.utcDate(value));
  }
  protected transactionCountLabel(count: number): string {
    return count === 1 ? '1 movimentação encontrada' : count + ' movimentações encontradas';
  }
  protected formatPercentage(value: number): string {
    return `${percentageFormatter.format(value)}%`;
  }
  protected categorySummaryTitle(): string {
    return this.categorySummaryType() === 'EXPENSE' ? 'Despesas por categoria' : 'Receitas por categoria';
  }
  protected categorySummaryEmptyDescription(): string {
    return this.categorySummaryType() === 'EXPENSE'
      ? 'Nenhuma despesa encontrada para os filtros selecionados.'
      : 'Nenhuma receita encontrada para os filtros selecionados.';
  }
  protected categoryPercentageTooltip(): string {
    return this.categorySummaryType() === 'EXPENSE'
      ? 'Participação desta categoria no total de despesas do período selecionado.'
      : 'Participação desta categoria no total de receitas do período selecionado.';
  }
  protected categorySummaryBarClasses(): string {
    return this.categorySummaryType() === 'EXPENSE' ? 'bg-danger' : 'bg-success';
  }
  protected categoryPercentageWidth(percentage: number): number {
    return Math.min(Math.max(percentage, 0), 100);
  }
  protected categoryTransactionCountLabel(count: number): string {
    return `${count} ${count === 1 ? 'movimentação' : 'movimentações'}`;
  }
  protected dateFieldError(name: 'startDate' | 'endDate'): string | null {
    return this.filterForm.controls[name].hasError('required') ? 'Informe a data.' : null;
  }
  protected periodError(): string | null {
    if (!(this.filterForm.dirty || this.filterForm.touched)) return null;
    if (this.filterForm.hasError('dateOrder')) {
      return 'A data final deve ser igual ou posterior à data inicial.';
    }
    if (this.filterForm.hasError('maxPeriod')) {
      return 'O período do relatório não pode ultrapassar 12 meses.';
    }
    return null;
  }
  protected statusVariant(status: FinancialReportTransaction['paymentStatus']): BadgeVariant {
    return status === 'PAID' ? 'success' : status === 'OVERDUE' ? 'danger' : 'warning';
  }
  protected statusLabel(status: FinancialReportTransaction['paymentStatus']): string {
    return status === 'PAID' ? 'Pago' : status === 'OVERDUE' ? 'Vencido' : 'Pendente';
  }
  protected valueClasses(type: FinancialReportTransaction['type']): string {
    return type === 'INCOME' ? 'font-semibold text-success' : 'font-semibold text-danger';
  }
  protected profitClasses(value: number): string {
    return value >= 0 ? 'text-success' : 'text-danger';
  }
  private signedValueTone(value: number): FinancialSummaryCard['tone'] {
    if (value > 0) {
      return 'success';
    }

    if (value < 0) {
      return 'danger';
    }

    return 'neutral';
  }
  private currencyCard(
    title: string,
    value: number,
    description: string,
    icon: string,
    tone?: FinancialSummaryCard['tone'],
  ): FinancialSummaryCard {
    return {
      title,
      value: this.formatCurrency(value),
      description,
      icon,
      tone: tone ?? this.signedValueTone(value),
    };
  }
  private percentageCard(
    title: string,
    value: number | null,
    description: string,
    icon = 'chart-no-axes-combined',
  ): FinancialSummaryCard {
    return {
      title,
      value: this.formatNullablePercentage(value),
      description,
      icon,
      tone: value === null ? 'neutral' : this.signedValueTone(value),
    };
  }
  private planningGroup(planning: FinancialPlanningIndicators): FinancialSummaryGroup {
    const unavailableDescription = this.planningUnavailableDescription(planning.availability);
    return {
      title: 'Planejamento',
      gridClasses: this.indicatorGridClasses,
      cards: [
        {
          title: 'Execução do orçamento',
          value:
            planning.incomeExecutionPercentage === null
              ? '—'
              : `Receitas: ${this.formatPercentage(planning.incomeExecutionPercentage)}`,
          meta:
            planning.expenseExecutionPercentage === null
              ? unavailableDescription
              : `Despesas: ${this.formatPercentage(planning.expenseExecutionPercentage)}`,
          description: 'Valores realizados em relação ao planejamento de cada tipo.',
          icon: 'chart-spline',
          tone: planning.availability === 'AVAILABLE' ? 'info' : 'neutral',
        },
        {
          title: 'Desvio do orçamento',
          value:
            planning.incomeDeviation === null
              ? '—'
              : `Receitas: ${this.formatCurrency(planning.incomeDeviation)}`,
          meta:
            planning.expenseDeviation === null
              ? unavailableDescription
              : `Despesas: ${this.formatCurrency(planning.expenseDeviation)}`,
          description: 'Valor realizado menos valor planejado, separado por tipo.',
          icon: 'chart-no-axes-column-increasing',
          tone: planning.availability === 'AVAILABLE' ? 'info' : 'neutral',
        },
      ],
    };
  }
  private highlightsGroup(report: FinancialReportResponse): FinancialSummaryGroup {
    const highlights = report.indicators;
    return {
      title: 'Destaques do período',
      gridClasses: this.indicatorGridClasses,
      cards: [
        {
          title: 'Período analisado',
          value: `${highlights.analyzedMonthCount} meses`,
          description: 'Quantidade de competências mensais analisadas.',
          icon: 'calendar-days',
          tone: 'neutral',
        },
        this.periodHighlightCard('Maior receita', highlights.highestIncomePeriod, 'trending-up', 'success'),
        this.periodHighlightCard('Maior despesa', highlights.highestExpensePeriod, 'trending-down', 'danger'),
        this.periodHighlightCard('Melhor resultado', highlights.bestBalancePeriod, 'chart-no-axes-combined', 'success'),
        this.periodHighlightCard('Período crítico', highlights.criticalPeriod, 'triangle-alert', 'danger'),
        {
          title: 'Categoria com maior despesa',
          value: highlights.highestExpenseCategory?.categoryName ?? '—',
          meta: this.formatNullableCurrency(highlights.highestExpenseCategory?.amount ?? null),
          description: 'Categoria com maior despesa dentro dos filtros.',
          icon: 'tags',
          tone: highlights.highestExpenseCategory ? 'danger' : 'neutral',
        },
        {
          title: 'Safra mais lucrativa',
          value: highlights.mostProfitableHarvest?.harvestSeasonName ?? '—',
          meta: this.formatNullableCurrency(highlights.mostProfitableHarvest?.profit ?? null),
          description: 'Safra com maior resultado dentro dos filtros.',
          icon: 'sprout',
          tone: highlights.mostProfitableHarvest ? 'success' : 'neutral',
        },
      ],
    };
  }
  private periodHighlightCard(
    title: string,
    indicator: { label: string; amount: number } | null,
    icon: string,
    tone: FinancialSummaryCard['tone'],
  ): FinancialSummaryCard {
    return {
      title,
      value: this.formatNullableCurrency(indicator?.amount ?? null),
      meta: indicator?.label ?? 'Indicador indisponível',
      description: 'Destaque calculado dentro do período filtrado.',
      icon,
      tone: indicator ? tone : 'neutral',
    };
  }
  private planningUnavailableDescription(
    availability: FinancialPlanningIndicators['availability'],
  ): string {
    switch (availability) {
      case 'HARVEST_REQUIRED':
        return 'Selecione uma única Safra.';
      case 'PARTIAL_PERIOD':
        return 'O período deve abranger toda a Safra.';
      case 'MISSING_PLANNING':
        return 'Planejamento não cadastrado.';
      default:
        return 'Indicador indisponível.';
    }
  }
  private formatNullableCurrency(value: number | null): string {
    return value === null ? '—' : this.formatCurrency(value);
  }
  private formatNullablePercentage(value: number | null): string {
    return value === null ? '—' : this.formatPercentage(value);
  }
  private formatNumber(value: number): string {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
  }
  private reportPeriodValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const startDate = control.get('startDate')?.value;
      const endDate = control.get('endDate')?.value;
      if (typeof startDate !== 'string' || !startDate || typeof endDate !== 'string' || !endDate) {
        return null;
      }
      if (endDate < startDate) return { dateOrder: true };
      return endDate > this.addCalendarMonths(startDate, 12) ? { maxPeriod: true } : null;
    };
  }
  private addCalendarMonths(value: string, months: number): string {
    const [year, month, day] = value.split('-').map(Number);
    const monthIndex = month - 1 + months;
    const targetYear = year + Math.floor(monthIndex / 12);
    const targetMonth = monthIndex % 12;
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const targetDay = Math.min(day, lastDay);
    return `${targetYear.toString().padStart(4, '0')}-${(targetMonth + 1).toString().padStart(2, '0')}-${targetDay.toString().padStart(2, '0')}`;
  }
  private request(farmId: number) {
    const filters = this.appliedFilters();
    return {
      farmId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      basis: filters.basis,
      harvestSeasonIds: filters.harvestSeasonId === null ? [] : [filters.harvestSeasonId],
      categoryIds: filters.categoryId === null ? [] : [filters.categoryId],
      granularity: this.evolutionGranularity(),
    };
  }
  private openPdf(response: HttpResponse<Blob>, pdfWindow: Window | null): void {
    if (!response.body) {
      pdfWindow?.close();
      this.toastStore.error('Não foi possível gerar o relatório em PDF.');
      return;
    }

    const url = URL.createObjectURL(response.body);
    if (pdfWindow) {
      pdfWindow.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = this.pdfFilename(response);
    link.click();
    URL.revokeObjectURL(url);
  }
  private pdfFilename(response: HttpResponse<Blob>): string {
    const contentDisposition = response.headers.get('content-disposition') ?? '';
    const match = /filename="?([^";]+)"?/.exec(contentDisposition);
    return match?.[1] ?? 'relatorio-financeiro.pdf';
  }
  private loadTransactions(period: FinancialEvolutionPoint, page: number): void {
    const farmId = this.selectedFarmStore.selectedFarmId();
    if (!farmId) return;
    const filters = this.request(farmId);
    this.transactionsLoading.set(true);
    this.transactionsError.set(null);
    this.transactions.set([]);
    this.financialService
      .getFinancialReportTransactions({
        ...filters,
        startDate: period.periodStart,
        endDate: period.periodEnd,
        page,
        size: 6,
        sort: 'referenceDate',
        direction: 'DESC',
      })
      .pipe(finalize(() => this.transactionsLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.transactionPage.set(response);
          this.transactions.set(response.content);
        },
        error: () =>
          this.transactionsError.set('Não foi possível carregar as movimentações do período.'),
      });
  }
  private resetForFarmChange(): void {
    this.report.set(null);
    this.reportError.set(null);
    this.selectedPeriod.set(null);
    this.transactions.set([]);
    this.transactionPage.set(null);
    this.transactionsError.set(null);
    this.harvestOptions.set([]);
    this.categoryOptions.set([]);
    this.filterForm.patchValue({ harvestSeasonId: '', categoryId: '' });
    this.appliedFilters.update((value) => ({ ...value, harvestSeasonId: null, categoryId: null }));
  }
  private optionId(value: GdFormValue): number | null {
    return typeof value === 'number' ? value : null;
  }
  private stringValue(value: GdFormValue, fallback: string): string {
    return typeof value === 'string' && value ? value : fallback;
  }
  private utcDate(value: string): Date {
    return new Date(value + 'T00:00:00Z');
  }
}
