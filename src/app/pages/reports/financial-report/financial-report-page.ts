import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import {
  FinancialReportBasis,
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
import { FinancialEvolutionChart } from './components/financial-evolution-chart/financial-evolution-chart';

interface AppliedReportFilters {
  startDate: string;
  endDate: string;
  basis: FinancialReportBasis;
  harvestSeasonId: number | null;
  categoryId: number | null;
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
    FinancialEvolutionChart,
    Input,
    LucideDynamicIcon,
    ReactiveFormsModule,
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
  readonly reportError = signal<string | null>(null);
  readonly selectedPeriod = signal<FinancialEvolutionPoint | null>(null);
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
  protected selectEvolutionPeriod(point: FinancialEvolutionPoint): void {
    this.selectedPeriod.set(point);
    this.loadTransactions(point, 0);
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
  private request(farmId: number) {
    const filters = this.appliedFilters();
    return {
      farmId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      basis: filters.basis,
      harvestSeasonIds: filters.harvestSeasonId === null ? [] : [filters.harvestSeasonId],
      categoryIds: filters.categoryId === null ? [] : [filters.categoryId],
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
