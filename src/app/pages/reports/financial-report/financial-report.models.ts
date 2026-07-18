export type FinancialReportBasis = 'CASH' | 'ACCRUAL';

export interface FinancialReportFilters {
  startDate: string;
  endDate: string;
  basis: FinancialReportBasis;
  harvestSeasonId: number | null;
  categoryId: number | null;
}

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

export interface FinancialEvolutionPoint {
  period: string;
  label: string;
  periodStart: string;
  periodEnd: string;
  income: number;
  expense: number;
  netBalance: number;
  transactionCount: number;
}

export interface FinancialCategorySummary {
  categoryId: number;
  categoryName: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  percentage: number;
  transactionCount: number;
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
  label: string;
  amount: number;
}

export interface FinancialCategoryIndicator {
  categoryName: string;
  amount: number;
}

export interface FinancialHarvestIndicator {
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

export interface FinancialReportOption {
  id: number;
  name: string;
}
