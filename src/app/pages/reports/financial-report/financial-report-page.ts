import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import { FarmAccessStore } from '../../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../../core/stores/selected-farm.store';
import { SessionStore } from '../../../core/stores/session.store';
import { GdFormControl, GdFormValue, GdSelectOption, Input, Select } from '../../../shared/forms';
import { Badge, BadgeVariant, Button, Card, EmptyState, SummaryCard, SummaryCardTone } from '../../../shared/ui';
import { FinancialEvolutionChart } from './components/financial-evolution-chart/financial-evolution-chart';
import { FINANCIAL_REPORT_CATEGORIES, FINANCIAL_REPORT_HARVESTS, FINANCIAL_REPORT_TRANSACTIONS } from './financial-report.mocks';
import {
  FinancialCategorySummary,
  FinancialEvolutionPoint,
  FinancialHarvestSummary,
  FinancialReportBasis,
  FinancialReportFilters,
  FinancialReportIndicators,
  FinancialReportSummary,
  FinancialReportTransaction,
} from './financial-report.models';

const DEFAULT_FILTERS: FinancialReportFilters = {
  startDate: '2026-01-01', endDate: '2026-12-31', basis: 'CASH', harvestSeasonId: null, categoryId: null,
};
const MONTHS = [
  ['2026-01', 'Jan', '2026-01-01', '2026-01-31'], ['2026-02', 'Fev', '2026-02-01', '2026-02-28'],
  ['2026-03', 'Mar', '2026-03-01', '2026-03-31'], ['2026-04', 'Abr', '2026-04-01', '2026-04-30'],
  ['2026-05', 'Mai', '2026-05-01', '2026-05-31'], ['2026-06', 'Jun', '2026-06-01', '2026-06-30'],
  ['2026-07', 'Jul', '2026-07-01', '2026-07-31'], ['2026-08', 'Ago', '2026-08-01', '2026-08-31'],
  ['2026-09', 'Set', '2026-09-01', '2026-09-30'], ['2026-10', 'Out', '2026-10-01', '2026-10-31'],
  ['2026-11', 'Nov', '2026-11-01', '2026-11-30'], ['2026-12', 'Dez', '2026-12-01', '2026-12-31'],
] as const;
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const percentageFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

@Component({
  selector: 'gd-financial-report-page',
  imports: [Badge, Button, Card, EmptyState, FinancialEvolutionChart, Input, LucideDynamicIcon, ReactiveFormsModule, Select, SummaryCard],
  templateUrl: './financial-report-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialReportPage {
  protected readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly farmAccessStore = inject(FarmAccessStore);
  protected readonly sessionStore = inject(SessionStore);

  readonly startDate = signal(DEFAULT_FILTERS.startDate);
  readonly endDate = signal(DEFAULT_FILTERS.endDate);
  readonly basis = signal<FinancialReportBasis>('CASH');
  readonly selectedHarvestId = signal<number | null>(null);
  readonly selectedCategoryId = signal<number | null>(null);
  readonly appliedFilters = signal<FinancialReportFilters>(DEFAULT_FILTERS);
  readonly selectedEvolutionPeriod = signal<FinancialEvolutionPoint | null>(null);
  protected readonly showAllTransactions = signal(false);

  protected readonly filterForm = new FormGroup({
    startDate: new FormControl<GdFormValue>(DEFAULT_FILTERS.startDate), endDate: new FormControl<GdFormValue>(DEFAULT_FILTERS.endDate),
    basis: new FormControl<GdFormValue>(DEFAULT_FILTERS.basis), harvestSeasonId: new FormControl<GdFormValue>(''), categoryId: new FormControl<GdFormValue>(''),
  });
  protected readonly basisOptions: readonly GdSelectOption[] = [{ label: 'Regime de caixa', value: 'CASH' }, { label: 'Regime de competência', value: 'ACCRUAL' }];
  protected readonly harvestOptions: readonly GdSelectOption[] = FINANCIAL_REPORT_HARVESTS.map((item) => ({ label: item.name, value: item.id }));
  protected readonly categoryOptions: readonly GdSelectOption[] = FINANCIAL_REPORT_CATEGORIES.map((item) => ({ label: item.name, value: item.id }));

  protected readonly canViewReport = computed(() => this.sessionStore.isAdmin() || (
    this.selectedFarmStore.selectedFarmId() !== null && this.farmAccessStore.access()?.farmId === this.selectedFarmStore.selectedFarmId() && this.farmAccessStore.canViewFinancial()
  ));
  protected readonly resolvedTransactions = computed(() => {
    const filters = this.appliedFilters();
    return FINANCIAL_REPORT_TRANSACTIONS.map((transaction) => ({ ...transaction, referenceDate: this.resolveReferenceDate(transaction, filters.basis) }))
      .filter((transaction): transaction is FinancialReportTransaction & { referenceDate: string } => transaction.referenceDate !== null);
  });
  protected readonly filteredTransactions = computed(() => {
    const filters = this.appliedFilters();
    return this.resolvedTransactions().filter((transaction) =>
      transaction.referenceDate >= filters.startDate && transaction.referenceDate <= filters.endDate &&
      (filters.harvestSeasonId === null || transaction.harvestSeasonId === filters.harvestSeasonId) &&
      (filters.categoryId === null || transaction.categoryId === filters.categoryId),
    );
  });
  protected readonly summary = computed<FinancialReportSummary>(() => this.calculateSummary(this.filteredTransactions()));
  protected readonly evolution = computed<readonly FinancialEvolutionPoint[]>(() => MONTHS.map(([period, label, periodStart, periodEnd]) => {
    const transactions = this.filteredTransactions().filter((transaction) => transaction.referenceDate >= periodStart && transaction.referenceDate <= periodEnd);
    const income = this.total(transactions, 'INCOME');
    const expense = this.total(transactions, 'EXPENSE');
    return { period, label, periodStart, periodEnd, income, expense, netBalance: income - expense, transactionCount: transactions.length };
  }));
  protected readonly categorySummaries = computed<readonly FinancialCategorySummary[]>(() => {
    const transactions = this.filteredTransactions();
    return [...new Map(transactions.map((transaction) => [transaction.categoryId, transaction])).values()]
      .map((category) => {
        const grouped = transactions.filter((transaction) => transaction.categoryId === category.categoryId);
        const amount = grouped.reduce((total, transaction) => total + transaction.amount, 0);
        const denominator = category.type === 'INCOME' ? this.total(transactions, 'INCOME') : this.total(transactions, 'EXPENSE');
        return { categoryId: category.categoryId, categoryName: category.categoryName, type: category.type, amount, percentage: denominator ? amount / denominator * 100 : 0, transactionCount: grouped.length };
      }).sort((first, second) => second.amount - first.amount);
  });
  protected readonly harvestSummaries = computed<readonly FinancialHarvestSummary[]>(() => {
    const transactions = this.filteredTransactions();
    const choices = [...FINANCIAL_REPORT_HARVESTS.map((harvest) => ({ id: harvest.id, name: harvest.name })), { id: null, name: 'Sem safra' }];
    return choices.map((harvest) => {
      const grouped = transactions.filter((transaction) => transaction.harvestSeasonId === harvest.id);
      const income = this.total(grouped, 'INCOME'); const expense = this.total(grouped, 'EXPENSE'); const profit = income - expense;
      return { harvestSeasonId: harvest.id, harvestSeasonName: harvest.name, income, expense, profit, marginPercentage: income ? profit / income * 100 : 0, transactionCount: grouped.length };
    }).filter((harvest) => harvest.transactionCount > 0);
  });
  protected readonly indicators = computed<FinancialReportIndicators>(() => {
    const points = this.evolution().filter((point) => point.transactionCount > 0);
    const expenseCategories = this.categorySummaries().filter((category) => category.type === 'EXPENSE');
    const harvests = this.harvestSummaries();
    return {
      analyzedMonthCount: points.length,
      highestIncomePeriod: this.periodIndicator(points, (point) => point.income, true), highestExpensePeriod: this.periodIndicator(points, (point) => point.expense, true),
      bestBalancePeriod: this.periodIndicator(points, (point) => point.netBalance, true), criticalPeriod: this.periodIndicator(points, (point) => point.netBalance, false),
      highestExpenseCategory: expenseCategories[0] ? { categoryName: expenseCategories[0].categoryName, amount: expenseCategories[0].amount } : null,
      mostProfitableHarvest: harvests.length ? { harvestSeasonName: [...harvests].sort((first, second) => second.profit - first.profit)[0].harvestSeasonName, profit: [...harvests].sort((first, second) => second.profit - first.profit)[0].profit } : null,
    };
  });
  protected readonly displayedTransactions = computed(() => {
    const period = this.selectedEvolutionPeriod();
    const transactions = period ? this.filteredTransactions().filter((transaction) => transaction.referenceDate >= period.periodStart && transaction.referenceDate <= period.periodEnd) : this.filteredTransactions();
    return this.showAllTransactions() ? transactions : transactions.slice(0, 6);
  });
  protected readonly periodTransactionsCount = computed(() => {
    const period = this.selectedEvolutionPeriod();
    return period ? this.filteredTransactions().filter((transaction) => transaction.referenceDate >= period.periodStart && transaction.referenceDate <= period.periodEnd).length : this.filteredTransactions().length;
  });
  protected readonly movementsTitle = computed(() => {
    const period = this.selectedEvolutionPeriod();
    return period ? `Movimentações de ${this.monthName(period.label).toLowerCase()} de 2026` : 'Movimentações do período';
  });

  protected applyFilters(): void {
    const value = this.filterForm.getRawValue();
    const startDate = this.stringValue(value.startDate, DEFAULT_FILTERS.startDate); const endDate = this.stringValue(value.endDate, DEFAULT_FILTERS.endDate);
    if (startDate > endDate) return;
    const basis = value.basis === 'ACCRUAL' ? 'ACCRUAL' : 'CASH';
    const harvestSeasonId = this.optionId(value.harvestSeasonId); const categoryId = this.optionId(value.categoryId);
    this.startDate.set(startDate); this.endDate.set(endDate); this.basis.set(basis); this.selectedHarvestId.set(harvestSeasonId); this.selectedCategoryId.set(categoryId);
    this.appliedFilters.set({ startDate, endDate, basis, harvestSeasonId, categoryId }); this.selectedEvolutionPeriod.set(null); this.showAllTransactions.set(false);
  }
  protected resetFilters(): void {
    this.filterForm.reset({ startDate: DEFAULT_FILTERS.startDate, endDate: DEFAULT_FILTERS.endDate, basis: DEFAULT_FILTERS.basis, harvestSeasonId: '', categoryId: '' });
    this.startDate.set(DEFAULT_FILTERS.startDate); this.endDate.set(DEFAULT_FILTERS.endDate); this.basis.set('CASH'); this.selectedHarvestId.set(null); this.selectedCategoryId.set(null);
    this.appliedFilters.set(DEFAULT_FILTERS); this.selectedEvolutionPeriod.set(null); this.showAllTransactions.set(false);
  }
  protected selectEvolutionPeriod(point: FinancialEvolutionPoint): void { this.selectedEvolutionPeriod.set(point); this.showAllTransactions.set(false); }
  protected toggleTransactions(): void { this.showAllTransactions.update((value) => !value); }
  protected statusVariant(status: FinancialReportTransaction['paymentStatus']): BadgeVariant { return status === 'PAID' ? 'success' : status === 'OVERDUE' ? 'danger' : 'warning'; }
  protected statusLabel(status: FinancialReportTransaction['paymentStatus']): string { return status === 'PAID' ? 'Pago' : status === 'OVERDUE' ? 'Vencido' : 'Pendente'; }
  protected valueClasses(type: FinancialReportTransaction['type']): string { return type === 'INCOME' ? 'font-semibold text-success' : 'font-semibold text-danger'; }
  protected profitClasses(value: number): string { return value >= 0 ? 'text-success' : 'text-danger'; }
  protected formatCurrency(value: number): string { return currencyFormatter.format(value); }
  protected formatPercentage(value: number): string { return `${percentageFormatter.format(value)}%`; }
  protected control(name: 'startDate' | 'endDate' | 'basis' | 'harvestSeasonId' | 'categoryId'): GdFormControl { return this.filterForm.controls[name]; }

  private resolveReferenceDate(transaction: FinancialReportTransaction, basis: FinancialReportBasis): string | null {
    if (basis === 'ACCRUAL') return transaction.transactionDate;
    return transaction.paymentStatus === 'PAID' ? transaction.paidAt ?? transaction.transactionDate : transaction.dueDate;
  }
  private calculateSummary(transactions: readonly FinancialReportTransaction[]): FinancialReportSummary {
    const totalIncome = this.total(transactions, 'INCOME'); const totalExpense = this.total(transactions, 'EXPENSE');
    const realizedIncome = this.total(transactions.filter((transaction) => transaction.paymentStatus === 'PAID'), 'INCOME'); const realizedExpense = this.total(transactions.filter((transaction) => transaction.paymentStatus === 'PAID'), 'EXPENSE');
    return { totalIncome, totalExpense, netBalance: totalIncome - totalExpense, marginPercentage: totalIncome ? (totalIncome - totalExpense) / totalIncome * 100 : 0, realizedIncome, realizedExpense, projectedIncome: totalIncome - realizedIncome, projectedExpense: totalExpense - realizedExpense };
  }
  private total(transactions: readonly FinancialReportTransaction[], type: FinancialReportTransaction['type']): number { return transactions.filter((transaction) => transaction.type === type).reduce((total, transaction) => total + transaction.amount, 0); }
  private periodIndicator(points: readonly FinancialEvolutionPoint[], value: (point: FinancialEvolutionPoint) => number, largest: boolean) { if (!points.length) return null; const point = points.reduce((best, current) => largest ? value(current) > value(best) ? current : best : value(current) < value(best) ? current : best); return { label: this.monthName(point.label), amount: value(point) }; }
  private optionId(value: GdFormValue): number | null { return typeof value === 'number' ? value : null; }
  private stringValue(value: GdFormValue, fallback: string): string { return typeof value === 'string' && value ? value : fallback; }
  private monthName(label: string): string { return ({ Jan: 'Janeiro', Fev: 'Fevereiro', Mar: 'Março', Abr: 'Abril', Mai: 'Maio', Jun: 'Junho', Jul: 'Julho', Ago: 'Agosto', Set: 'Setembro', Out: 'Outubro', Nov: 'Novembro', Dez: 'Dezembro' })[label] ?? label; }
}
