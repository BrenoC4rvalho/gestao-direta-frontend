import { PageRequest } from './page-response.model';

export type FinancialReportBasis = 'CASH' | 'ACCRUAL';
export type FinancialReportGranularity = 'MONTHLY' | 'QUARTERLY';
export interface FinancialReportRequest {
  farmId: number;
  startDate: string;
  endDate: string;
  basis: FinancialReportBasis;
  harvestSeasonIds: readonly number[];
  categoryIds: readonly number[];
  granularity?: FinancialReportGranularity;
}
export interface FinancialReportTransactionsRequest
  extends
    FinancialReportRequest,
    Required<Pick<PageRequest, 'page' | 'size' | 'sort' | 'direction'>> {}
export interface FinancialReportSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  marginPercentage: number;
  realizedIncome: number;
  realizedExpense: number;
  projectedIncome: number;
  projectedExpense: number;
}
export interface FinancialReportCommitments {
  accountsReceivable: number;
  accountsPayable: number;
  overdueReceivableAmount: number;
  overdueReceivableCount: number;
  overduePayableAmount: number;
  overduePayableCount: number;
  next30DaysAvailable: boolean;
  next30DaysReceivable: number | null;
  next30DaysPayable: number | null;
}
export interface FinancialEvolutionPoint {
  period: string;
  label: string;
  periodStart: string;
  periodEnd: string;
  income: number;
  expense: number;
  netBalance: number;
  transactionCount: number;
  realizedIncome: number;
  projectedIncome: number;
  overdueIncome: number;
  overdueIncomeCount: number;
  realizedExpense: number;
  projectedExpense: number;
  overdueExpense: number;
  overdueExpenseCount: number;
  realizedResult: number;
  currentPeriod: boolean;
}
export interface FinancialCategorySummary {
  categoryId: number;
  categoryName: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  percentage: number;
  transactionCount: number;
}
export interface FinancialCategorySummaryGroup {
  type: 'INCOME' | 'EXPENSE';
  totalAmount: number;
  totalTransactionCount: number;
  items: readonly FinancialCategorySummary[];
}
export interface FinancialHarvestSummary {
  harvestSeasonId: number | null;
  harvestSeasonName: string;
  income: number;
  expense: number;
  profit: number;
  marginPercentage: number;
  transactionCount: number;
}
export interface FinancialPeriodIndicator {
  period: string;
  label: string;
  amount: number;
}
export interface FinancialCategoryIndicator {
  categoryId: number;
  categoryName: string;
  amount: number;
}
export interface FinancialHarvestIndicator {
  harvestSeasonId: number | null;
  harvestSeasonName: string;
  profit: number;
}
export interface FinancialReportIndicators {
  analyzedMonthCount: number;
  highestIncomePeriod: FinancialPeriodIndicator | null;
  highestExpensePeriod: FinancialPeriodIndicator | null;
  bestBalancePeriod: FinancialPeriodIndicator | null;
  criticalPeriod: FinancialPeriodIndicator | null;
  highestExpenseCategory: FinancialCategoryIndicator | null;
  mostProfitableHarvest: FinancialHarvestIndicator | null;
}
export interface FinancialReportUnallocated {
  income: number;
  expense: number;
  transactionCount: number;
}
export interface FinancialReportResponse {
  farmId: number;
  startDate: string;
  endDate: string;
  basis: FinancialReportBasis;
  summary: FinancialReportSummary;
  commitments: FinancialReportCommitments;
  evolution: readonly FinancialEvolutionPoint[];
  categories: readonly FinancialCategorySummaryGroup[];
  harvests: readonly FinancialHarvestSummary[];
  indicators: FinancialReportIndicators;
  unallocated: FinancialReportUnallocated;
}
export interface FinancialReportTransaction {
  id: number;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  paymentStatus: 'PAID' | 'PENDING' | 'OVERDUE';
  transactionDate: string;
  dueDate: string | null;
  paidAt: string | null;
  referenceDate: string;
  categoryId: number;
  categoryName: string;
  harvestSeasonId: number | null;
  harvestSeasonName: string | null;
}
