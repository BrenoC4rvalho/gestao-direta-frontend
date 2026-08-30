import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import {
  FinancialReportBasis,
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
} from '../../../shared/ui';
import { Drawer } from '../../../shared/overlays';
import { FinancialEvolutionChart } from './components/financial-evolution-chart/financial-evolution-chart';

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
    Input,
    LucideDynamicIcon,
    ReactiveFormsModule,
    NgTemplateOutlet,
    Select,
    Skeleton,
    SummaryCard,
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
  private currentFarmId: number | null = null;
  private readonly reload = signal(0);
  private readonly currencyPipe = new BrCurrencyPipe();
  private readonly dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
  private readonly periodFormatter = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  readonly report = signal<FinancialReportResponse | null>(null);
  readonly reportLoading = signal(false);
  protected readonly indicatorsDrawerOpen = signal(false);
  readonly reportError = signal<string | null>(null);
  readonly selectedPeriod = signal<FinancialEvolutionPoint | null>(null);
  protected readonly evolutionGranularity = signal<FinancialReportGranularity>('MONTHLY');
  readonly transactions = signal<readonly FinancialReportTransaction[]>([]);
  readonly transactionsLoading = signal(false);
  readonly transactionsError = signal<string | null>(null);
  protected readonly transactionPage = signal<PageResponse<FinancialReportTransaction> | null>(
    null,
  );
  protected readonly harvestOptions = signal<readonly GdSelectOption[]>([]);
  protected readonly categoryOptions = signal<readonly GdSelectOption[]>([]);
  protected readonly filterForm = new FormGroup({
    startDate: new FormControl<GdFormValue>(DEFAULT_FILTERS.startDate),
    endDate: new FormControl<GdFormValue>(DEFAULT_FILTERS.endDate),
    basis: new FormControl<GdFormValue>(DEFAULT_FILTERS.basis),
    harvestSeasonId: new FormControl<GdFormValue>(''),
    categoryId: new FormControl<GdFormValue>(''),
  });
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
  protected readonly movementsPeriod = computed(() => {
    const period = this.selectedPeriod();
    return period ? this.periodFormatter.format(this.utcDate(period.periodStart)) : null;
  });
  protected readonly financialSummaryGroups = computed<readonly FinancialSummaryGroup[]>(() => {
    const summary = this.report()?.summary;

    if (!summary) {
      return [];
    }

    const realizedResult = summary.realizedIncome - summary.realizedExpense;
    const projectedResult = summary.projectedIncome - summary.projectedExpense;
    const commitments = this.report()?.commitments;

    return [
      {
        title: 'Visão consolidada',
        gridClasses: 'grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4',
        cards: [
          {
            title: 'Receitas totais',
            value: this.formatCurrency(summary.totalIncome),
            description:
              'Soma das receitas realizadas e projetadas incluídas no período pelo regime selecionado.',
            icon: 'trending-up',
            tone: 'success',
          },
          {
            title: 'Despesas totais',
            value: this.formatCurrency(summary.totalExpense),
            description:
              'Soma das despesas realizadas e projetadas incluídas no período pelo regime selecionado.',
            icon: 'trending-down',
            tone: 'danger',
          },
          {
            title: 'Saldo líquido',
            value: this.formatCurrency(summary.netBalance),
            description:
              'Diferença entre as receitas e as despesas incluídas no período analisado.',
            icon: 'wallet',
            tone: this.signedValueTone(summary.netBalance),
          },
          {
            title: 'Margem',
            value: this.formatPercentage(summary.marginPercentage),
            description:
              'Percentual do saldo líquido em relação às receitas incluídas no período.',
            icon: 'chart-no-axes-combined',
            tone: summary.marginPercentage >= 0 ? 'info' : 'danger',
          },
        ],
      },
      {
        title: 'Realizado',
        gridClasses: 'grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3',
        cards: [
          {
            title: 'Receitas realizadas',
            value: this.formatCurrency(summary.realizedIncome),
            description:
              'Receitas com status pago incluídas no período pelo regime selecionado.',
            icon: 'circle-check',
            tone: 'success',
            meta: `${this.realizedPercentage(summary.realizedIncome, summary.totalIncome)} do total`,
          },
          {
            title: 'Despesas realizadas',
            value: this.formatCurrency(summary.realizedExpense),
            description:
              'Despesas com status pago incluídas no período pelo regime selecionado.',
            icon: 'circle-check',
            tone: 'danger',
            meta: `${this.realizedPercentage(summary.realizedExpense, summary.totalExpense)} do total`,
          },
          {
            title: 'Resultado realizado',
            value: this.formatCurrency(realizedResult),
            description:
              'Receitas realizadas menos despesas realizadas no período selecionado.',
            icon: 'chart-no-axes-combined',
            tone: this.signedValueTone(realizedResult),
          },
        ],
      },
      {
        title: 'Projetado',
        gridClasses: 'grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3',
        cards: [
          {
            title: 'Receitas projetadas',
            value: this.formatCurrency(summary.projectedIncome),
            description:
              'Receitas pendentes ou vencidas incluídas no período pelo regime selecionado.',
            icon: 'clock',
            tone: 'success',
          },
          {
            title: 'Despesas projetadas',
            value: this.formatCurrency(summary.projectedExpense),
            description:
              'Despesas pendentes ou vencidas incluídas no período pelo regime selecionado.',
            icon: 'clock',
            tone: 'danger',
          },
          {
            title: 'Resultado projetado',
            value: this.formatCurrency(projectedResult),
            description:
              'Receitas projetadas menos despesas projetadas no período selecionado.',
            icon: 'chart-no-axes-combined',
            tone: this.signedValueTone(projectedResult),
          },
        ],
      },
      ...(commitments
        ? [
            {
              title: 'Compromissos financeiros',
              gridClasses: 'grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4',
              cards: [
                {
                  title: 'Contas a receber',
                  value: this.formatCurrency(commitments.accountsReceivable),
                  description: 'Receitas em aberto na data final do período selecionado.',
                  icon: 'circle-dollar-sign',
                  tone: 'success' as const,
                },
                {
                  title: 'Contas a pagar',
                  value: this.formatCurrency(commitments.accountsPayable),
                  description: 'Despesas em aberto na data final do período selecionado.',
                  icon: 'receipt-text',
                  tone: 'danger' as const,
                },
                {
                  title: 'Vencido a receber',
                  value: this.formatCurrency(commitments.overdueReceivableAmount),
                  meta: this.overdueMeta(commitments.overdueReceivableCount),
                  description: 'Receitas em aberto vencidas antes da data final do período.',
                  icon: 'triangle-alert',
                  tone:
                    commitments.overdueReceivableAmount > 0
                      ? ('warning' as const)
                      : ('neutral' as const),
                },
                {
                  title: 'Vencido a pagar',
                  value: this.formatCurrency(commitments.overduePayableAmount),
                  meta: this.overdueMeta(commitments.overduePayableCount),
                  description: 'Despesas em aberto vencidas antes da data final do período.',
                  icon: 'triangle-alert',
                  tone:
                    commitments.overduePayableAmount > 0
                      ? ('danger' as const)
                      : ('neutral' as const),
                },
              ],
            },
            ...(commitments.next30DaysAvailable
              ? [
                  {
                    title: 'Próximos 30 dias',
                    gridClasses:
                      'grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4',
                    cards: [
                      {
                        title: 'Recebimentos previstos',
                        value: this.formatCurrency(commitments.next30DaysReceivable ?? 0),
                        description: 'Receitas previstas entre hoje e os próximos 30 dias.',
                        icon: 'trending-up',
                        tone: 'success' as const,
                      },
                      {
                        title: 'Pagamentos previstos',
                        value: this.formatCurrency(commitments.next30DaysPayable ?? 0),
                        description: 'Despesas previstas entre hoje e os próximos 30 dias.',
                        icon: 'trending-down',
                        tone: 'danger' as const,
                      },
                      {
                        title: 'Fluxo líquido previsto',
                        value: this.formatCurrency(
                          (commitments.next30DaysReceivable ?? 0) -
                            (commitments.next30DaysPayable ?? 0),
                        ),
                        description:
                          'Recebimentos menos pagamentos previstos entre hoje e os próximos 30 dias.',
                        icon: 'wallet',
                        tone: this.signedValueTone(
                          (commitments.next30DaysReceivable ?? 0) -
                            (commitments.next30DaysPayable ?? 0),
                        ),
                      },
                      {
                        title: 'Cobertura financeira',
                        value: this.coverageValue(
                          commitments.next30DaysReceivable ?? 0,
                          commitments.next30DaysPayable ?? 0,
                        ),
                        description:
                          'Relação entre recebimentos e pagamentos previstos entre hoje e os próximos 30 dias.',
                        icon: 'shield-check',
                        tone: 'info' as const,
                      },
                    ],
                  },
                ]
              : []),
          ]
        : []),
    ];
  });
  protected readonly consolidatedSummaryGroups = computed(() =>
    this.financialSummaryGroups().filter((group) => group.title === 'Visão consolidada'),
  );

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
    const value = this.filterForm.getRawValue();
    const startDate = this.stringValue(value.startDate, DEFAULT_FILTERS.startDate);
    const endDate = this.stringValue(value.endDate, DEFAULT_FILTERS.endDate);
    if (startDate > endDate) return;
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
  private realizedPercentage(realized: number, total: number): string {
    return this.formatPercentage(total === 0 ? 0 : (realized / total) * 100);
  }
  private overdueMeta(count: number): string {
    if (count === 0) {
      return 'Nenhum valor vencido';
    }

    return `${count} movimentação${count === 1 ? '' : 'ões'} vencida${count === 1 ? '' : 's'}`;
  }
  private coverageValue(receivable: number, payable: number): string {
    if (payable === 0) {
      return receivable > 0 ? 'Sem compromissos' : '—';
    }

    return `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(receivable / payable)}x`;
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
