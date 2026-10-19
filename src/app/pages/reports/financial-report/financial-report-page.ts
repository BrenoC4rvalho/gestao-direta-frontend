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
import { Router } from '@angular/router';
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
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { provideFinancialReportLucideIcons } from '../../../core/constants/lucide-icons';
import {
  FinancialReportBasis,
  FinancialCategorySummaryGroup,
  FinancialReportComparison,
  FinancialReportComparisonMetric,
  FinancialHarvestPlanningComparison,
  FinancialPlanningIndicators,
  FinancialReportGranularity,
  FinancialReportResponse,
  FinancialCommitmentSegment,
  FinancialCommitmentStatus,
} from '../../../core/models/financial-report.models';
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
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  SummaryCard,
  SummaryCardComparison,
  Tooltip,
} from '../../../shared/ui';
import { Dialog, Drawer } from '../../../shared/overlays';
import { FinancialEvolutionChart } from './components/financial-evolution-chart/financial-evolution-chart';
import { FinancialCashFlowChart } from './components/financial-cash-flow-chart/financial-cash-flow-chart';
import { FinancialCommitmentStatusComponent } from './components/financial-commitment-status/financial-commitment-status';
import { FinancialHarvestSummaryChart } from './components/financial-harvest-summary-chart/financial-harvest-summary-chart';
import { FinancialHarvestParticipation } from './components/financial-harvest-participation/financial-harvest-participation';

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
  comparison?: SummaryCardComparison;
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
const reportDateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const appliedFilterDateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

@Component({
  selector: 'gd-financial-report-page',
  imports: [
    Button,
    Card,
    EmptyState,
    ErrorState,
    Dialog,
    Drawer,
    FinancialEvolutionChart,
    FinancialCashFlowChart,
    FinancialCommitmentStatusComponent,
    FinancialHarvestSummaryChart,
    FinancialHarvestParticipation,
    Input,
    LucideDynamicIcon,
    ReactiveFormsModule,
    NgTemplateOutlet,
    Select,
    Skeleton,
    SummaryCard,
    Tooltip,
  ],
  providers: [provideFinancialReportLucideIcons(), provideCharts(withDefaultRegisterables())],
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
  private readonly router = inject(Router);
  private currentFarmId: number | null = null;
  private readonly reload = signal(0);
  private readonly currencyPipe = new BrCurrencyPipe();
  private readonly indicatorGridClasses =
    'grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4';

  readonly report = signal<FinancialReportResponse | null>(null);
  readonly reportLoading = signal(false);
  protected readonly exportingPdf = signal(false);
  protected readonly filtersDialogOpen = signal(false);
  protected readonly indicatorsDrawerOpen = signal(false);
  readonly reportError = signal<string | null>(null);
  readonly commitmentStatus = signal<FinancialCommitmentStatus | null>(null);
  readonly commitmentStatusError = signal(false);
  protected readonly evolutionGranularity = signal<FinancialReportGranularity>('MONTHLY');
  protected readonly categorySummaryType = signal<'EXPENSE' | 'INCOME'>('EXPENSE');
  protected readonly harvestViewMode = signal<'cards' | 'chart' | 'participation'>('cards');
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
  protected readonly appliedFilterChips = computed(() => {
    const filters = this.appliedFilters();
    return [
      {
        icon: 'calendar-days',
        label: `${this.formatAppliedFilterDate(filters.startDate)} a ${this.formatAppliedFilterDate(filters.endDate)}`,
      },
      {
        icon: 'wallet',
        label: filters.basis === 'ACCRUAL' ? 'Regime de competência' : 'Regime de caixa',
      },
      {
        icon: 'sprout',
        label: this.appliedOptionLabel(filters.harvestSeasonId, this.harvestOptions(), 'Todas as safras'),
      },
      {
        icon: 'tags',
        label: this.appliedOptionLabel(filters.categoryId, this.categoryOptions(), 'Todas as categorias'),
      },
    ];
  });
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
  protected readonly selectedCategorySummary = computed<FinancialCategorySummaryGroup | null>(() =>
    this.report()?.categories.find((group) => group.type === this.categorySummaryType()) ?? null,
  );
  protected readonly primaryIndicatorCards = computed<readonly FinancialSummaryCard[]>(() => {
    const report = this.report();
    if (!report) return [];

    const indicators = report.financialIndicators;

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
        comparison: this.reportComparison(report.comparison, 'realizedIncome') ?? undefined,
      },
      {
        title: 'Despesas realizadas',
        value: this.formatCurrency(indicators.result.realizedExpense),
        description: 'Despesas efetivamente pagas até a data de corte.',
        icon: 'circle-check',
        tone: 'danger',
        comparison: this.reportComparison(report.comparison, 'realizedExpense') ?? undefined,
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
          this.currencyCard(
            'Receitas realizadas',
            result.realizedIncome,
            'Receitas efetivamente recebidas.',
            'circle-check',
            'success',
            this.reportComparison(report.comparison, 'realizedIncome'),
          ),
          this.currencyCard(
            'Despesas realizadas',
            result.realizedExpense,
            'Despesas efetivamente pagas.',
            'circle-check',
            'danger',
            this.reportComparison(report.comparison, 'realizedExpense'),
          ),
          this.currencyCard(
            'Resultado realizado',
            result.realizedResult,
            'Receitas realizadas menos despesas realizadas.',
            'chart-no-axes-combined',
            undefined,
            this.reportComparison(report.comparison, 'realizedResult'),
          ),
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
      this.commitmentStatusError.set(false);
      this.report.set(null);
      this.commitmentStatus.set(null);
      const filters = this.request(farmId);
      const subscription = forkJoin({
        report: this.financialService.getFinancialReport(filters),
        commitmentStatus: this.financialService
          .getFinancialCommitmentStatus(filters)
          .pipe(catchError(() => of(null))),
      })
        .pipe(finalize(() => this.reportLoading.set(false)))
        .subscribe({
          next: ({ report, commitmentStatus }) => {
            this.report.set(report);
            this.commitmentStatus.set(commitmentStatus);
            this.commitmentStatusError.set(commitmentStatus === null);
          },
          error: () => {
            this.report.set(null);
            this.commitmentStatus.set(null);
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
      this.filtersDialogOpen.set(true);
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
    this.filtersDialogOpen.set(false);
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
  protected openFiltersDialog(): void {
    this.restoreDraftFilters();
    this.filtersDialogOpen.set(true);
  }
  protected closeFiltersDialog(): void {
    this.restoreDraftFilters();
    this.filtersDialogOpen.set(false);
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
  protected selectEvolutionGranularity(granularity: FinancialReportGranularity): void {
    if (this.evolutionGranularity() === granularity) return;
    this.evolutionGranularity.set(granularity);
    this.reload.update((value) => value + 1);
  }
  protected selectCategorySummaryType(type: 'EXPENSE' | 'INCOME'): void {
    this.categorySummaryType.set(type);
  }
  protected openCommitmentSegment(segment: FinancialCommitmentSegment): void {
    const filters = this.appliedFilters();
    const historical =
      segment.startsWith('PAID_') ||
      segment.startsWith('RECEIVED_') ||
      segment.startsWith('UNCLASSIFIABLE_');
    void this.router.navigate(['/transactions'], {
      queryParams: {
        commitmentSegment: segment,
        startDate: historical ? filters.startDate : null,
        endDate: historical ? filters.endDate : null,
        categoryIds: filters.categoryId === null ? null : filters.categoryId,
        harvestSeasonId: filters.harvestSeasonId,
      },
    });
  }
  protected control(
    name: 'startDate' | 'endDate' | 'basis' | 'harvestSeasonId' | 'categoryId',
  ): GdFormControl {
    return this.filterForm.controls[name];
  }
  protected formatCurrency(value: number): string {
    return this.currencyPipe.transform(value);
  }
  protected formatPercentage(value: number): string {
    return `${percentageFormatter.format(value)}%`;
  }
  protected harvestComparisonClasses(comparison: FinancialHarvestPlanningComparison): string {
    if (comparison.semantic === 'BETTER') {
      return 'bg-success/10 text-success';
    }
    if (comparison.semantic === 'WORSE') {
      return 'bg-danger/10 text-danger';
    }
    return 'bg-background text-text-muted';
  }
  protected harvestComparisonLabel(comparison: FinancialHarvestPlanningComparison): string {
    const percentage = comparison.percentageDifference;
    if (percentage === null) return 'Sem variação percentual';
    const suffix =
      comparison.semantic === 'BETTER'
        ? 'melhor'
        : comparison.semantic === 'WORSE'
          ? 'pior'
          : '';
    return `${this.formatPercentage(Math.abs(percentage))}${suffix ? ` ${suffix}` : ''}`;
  }
  protected harvestShareWidth(percentage: number): number {
    return Math.max(percentage, 0);
  }
  protected setHarvestViewMode(mode: 'cards' | 'chart' | 'participation'): void {
    this.harvestViewMode.set(mode);
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
    comparison?: SummaryCardComparison | null,
  ): FinancialSummaryCard {
    return {
      title,
      value: this.formatCurrency(value),
      description,
      icon,
      tone: tone ?? this.signedValueTone(value),
      comparison: comparison ?? undefined,
    };
  }

  private reportComparison(
    comparison: FinancialReportComparison | undefined,
    metricName: 'realizedIncome' | 'realizedExpense' | 'realizedResult',
  ): SummaryCardComparison | null {
    if (!comparison) {
      return null;
    }

    const metric = comparison[metricName];
    return {
      label: this.reportComparisonLabel(comparison, metric),
      tooltip: this.reportComparisonTooltip(comparison, metric),
      semantic: metric.semantic,
    };
  }

  private reportComparisonLabel(
    comparison: FinancialReportComparison,
    metric: FinancialReportComparisonMetric,
  ): string {
    if (!comparison.previousDataAvailable) {
      return 'Sem base de comparação';
    }

    if (metric.percentageDifference === null) {
      return 'Sem base de comparação';
    }

    if (metric.semantic === 'NEUTRAL') {
      return 'Sem variação';
    }

    const semanticLabel = metric.semantic === 'BETTER' ? 'melhor' : 'pior';
    return `${this.formatPercentage(Math.abs(metric.percentageDifference))} ${semanticLabel}`;
  }

  private reportComparisonTooltip(
    comparison: FinancialReportComparison,
    metric: FinancialReportComparisonMetric,
  ): string {
    const currentPeriod = `${this.formatReportDate(comparison.currentStartDate)} a ${this.formatReportDate(comparison.currentEndDate)}`;
    const previousPeriod = `${this.formatReportDate(comparison.previousStartDate)} a ${this.formatReportDate(comparison.previousEndDate)}`;
    const previousValue =
      metric.previousValue === null
        ? 'Não disponível'
        : this.formatCurrency(metric.previousValue);
    const availability = comparison.previousDataAvailable
      ? ''
      : '\nNão há movimentações realizadas no período anterior.';

    return `Período atual: ${currentPeriod}\nPeríodo anterior: ${previousPeriod}\nValor anterior: ${previousValue}${availability}`;
  }

  private formatReportDate(value: string): string {
    return reportDateFormatter.format(new Date(`${value}T00:00:00Z`));
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
  protected formatNullableCurrency(value: number | null): string {
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
  private resetForFarmChange(): void {
    this.report.set(null);
    this.reportError.set(null);
    this.harvestOptions.set([]);
    this.categoryOptions.set([]);
    this.filterForm.patchValue({ harvestSeasonId: '', categoryId: '' });
    this.appliedFilters.update((value) => ({ ...value, harvestSeasonId: null, categoryId: null }));
    this.filtersDialogOpen.set(false);
  }

  private restoreDraftFilters(): void {
    const filters = this.appliedFilters();
    this.filterForm.reset(
      {
        startDate: filters.startDate,
        endDate: filters.endDate,
        basis: filters.basis,
        harvestSeasonId: filters.harvestSeasonId ?? '',
        categoryId: filters.categoryId ?? '',
      },
      { emitEvent: false },
    );
  }

  private appliedOptionLabel(
    id: number | null,
    options: readonly GdSelectOption[],
    fallback: string,
  ): string {
    return id === null ? fallback : options.find((option) => option.value === id)?.label ?? fallback;
  }

  private formatAppliedFilterDate(value: string): string {
    return appliedFilterDateFormatter.format(new Date(`${value}T00:00:00Z`));
  }
  private optionId(value: GdFormValue): number | null {
    return typeof value === 'number' ? value : null;
  }
  private stringValue(value: GdFormValue, fallback: string): string {
    return typeof value === 'string' && value ? value : fallback;
  }
}
