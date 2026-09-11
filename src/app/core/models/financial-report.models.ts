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
export interface FinancialCumulativeEvolutionPoint {
  period: string;
  label: string;
  periodStart: string;
  periodEnd: string;
  cumulativeIncome: number;
  cumulativeExpense: number;
}
export interface FinancialCashFlowPoint {
  period: string;
  label: string;
  periodStart: string;
  periodEnd: string;
  realizedIncome: number;
  realizedExpense: number;
  projectedIncome: number;
  projectedExpense: number;
  overdueIncome: number;
  overdueExpense: number;
  expectedBalance: number;
  projectedBalance: number;
  currentPeriod: boolean;
}
export interface FinancialCashFlow {
  openingExpectedBalance: number;
  openingProjectedBalance: number;
  points: readonly FinancialCashFlowPoint[];
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
export type FinancialPlanningAvailability =
  | 'AVAILABLE'
  | 'HARVEST_REQUIRED'
  | 'PARTIAL_PERIOD'
  | 'MISSING_PLANNING';
export interface FinancialResultIndicators {
  totalIncome: number;
  totalExpense: number;
  projectedResult: number;
  marginPercentage: number | null;
  realizedIncome: number;
  realizedExpense: number;
  realizedResult: number;
}
export interface FinancialLiquidityIndicators {
  accountsReceivable: number;
  accountsPayable: number;
  overdueReceivable: number;
  overduePayable: number;
  coveragePercentage: number | null;
  cashNeed: number;
}
export interface FinancialEfficiencyIndicators {
  costToIncomePercentage: number | null;
  returnOnCostsPercentage: number | null;
}
export interface FinancialRuralManagementIndicators {
  areaHectares: number;
  incomePerHectare: number;
  costPerHectare: number;
  resultPerHectare: number;
}
export interface FinancialPlanningIndicators {
  availability: FinancialPlanningAvailability;
  incomeExecutionPercentage: number | null;
  expenseExecutionPercentage: number | null;
  incomeDeviation: number | null;
  expenseDeviation: number | null;
}
export interface FinancialIndicators {
  result: FinancialResultIndicators;
  liquidity: FinancialLiquidityIndicators;
  efficiency: FinancialEfficiencyIndicators;
  ruralManagement: FinancialRuralManagementIndicators | null;
  planning: FinancialPlanningIndicators;
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
  realizedCumulativeEvolution: readonly FinancialCumulativeEvolutionPoint[];
  cashFlow: FinancialCashFlow;
  categories: readonly FinancialCategorySummaryGroup[];
  harvests: readonly FinancialHarvestSummary[];
  financialIndicators: FinancialIndicators;
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
