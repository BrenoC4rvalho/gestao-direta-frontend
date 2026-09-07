import { FinancialAmountSummary } from './financial.models';
import { PageRequest } from './page-response.model';

export type HarvestSeasonStatus = 'PLANNED' | 'IN_PROGRESS' | 'FINISHED' | 'INACTIVE';

export interface HarvestSeason {
  id: number;
  farmId: number;
  farmName?: string | null;
  productionActivityId: number;
  productionActivityName: string;
  name: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  expectedRevenue?: number | null;
  expectedCost?: number | null;
  areaHectares?: number | null;
  status: HarvestSeasonStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface HarvestSeasonSummaryListItem {
  id: number;
  farmId: number;
  farmName?: string | null;
  productionActivityId?: number | null;
  productionActivityName?: string | null;
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  expectedCost?: number | null;
  expectedRevenue?: number | null;
  expectedProfit?: number | null;
  areaHectares?: number | null;
  status: HarvestSeasonStatus;
  realizedCost?: number | null;
  realizedRevenue?: number | null;
  realizedProfit?: number | null;
  pendingExpenses?: number | null;
  overdueExpenses?: number | null;
  pendingRevenue?: number | null;
  transactionCount?: number | null;
  incomeCount?: number | null;
  expenseCount?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardHarvestFinancialValues {
  cost: number;
  revenue: number;
  profit: number;
}

export interface DashboardHarvestSeason {
  id: number;
  farmId: number;
  name: string;
  status: HarvestSeasonStatus;
  productionActivityId: number | null;
  productionActivityName: string | null;
  realized: DashboardHarvestFinancialValues;
  projection: DashboardHarvestFinancialValues;
  dueNext7Days: FinancialAmountSummary;
  overdue: FinancialAmountSummary;
}

export interface CreateHarvestSeasonRequest {
  farmId: number;
  productionActivityId: number;
  name: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  areaHectares?: number | null;
}

export interface UpdateHarvestSeasonRequest {
  productionActivityId: number;
  name: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  areaHectares?: number | null;
}

export interface HarvestSeasonBudgetItemRequest {
  categoryId: number;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  plannedAmount: number;
}

export interface HarvestSeasonBudgetItem {
  id: number;
  harvestSeasonId: number;
  categoryId: number | null;
  categoryName: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  plannedAmount: number;
}

export interface HarvestSeasonBudgetCategory {
  categoryId: number | null;
  categoryName: string;
  type: 'INCOME' | 'EXPENSE';
  itemCount: number;
  plannedAmount: number;
  items: HarvestSeasonBudgetItem[];
}

export interface HarvestSeasonBudget {
  harvestSeasonId: number;
  plannedRevenue: number;
  plannedExpense: number;
  plannedResult: number;
  plannedMargin: number;
  expenses: HarvestSeasonBudgetCategory[];
  incomes: HarvestSeasonBudgetCategory[];
}

export interface UpdateHarvestSeasonStatusRequest {
  status: HarvestSeasonStatus;
}

export interface HarvestSeasonListParams extends PageRequest {
  farmId?: number | null;
  includeInactive?: boolean | null;
}

export interface HarvestSeasonSummaryListParams extends PageRequest {
  farmId: number;
  search?: string | null;
  statuses?: HarvestSeasonStatus[] | null;
  productionActivityId?: number | null;
  productionActivityIds?: number[] | null;
  periodStart?: string | null;
  periodEnd?: string | null;
}

export interface HarvestSeasonFilters {
  farmId: number;
  search?: string | null;
  statuses?: HarvestSeasonStatus[] | null;
  productionActivityIds?: number[] | null;
  periodStart?: string | null;
  periodEnd?: string | null;
}

export interface HarvestSeasonPlanningSummary {
  plannedCost: number;
  plannedRevenue: number;
  plannedProfit: number;
  plannedMargin: number;
}

export interface HarvestSeasonRealizedSummary {
  realizedCost: number;
  realizedRevenue: number;
  realizedProfit: number;
  realizedMargin: number;
}

export interface HarvestSeasonProjectionSummary {
  projectedCost: number;
  projectedRevenue: number;
  projectedProfit: number;
  projectedMargin: number;
}

export type HarvestComparisonStatus =
  'ABOVE_PLANNED' | 'BELOW_PLANNED' | 'ON_TARGET' | 'NOT_APPLICABLE' | string;

export interface HarvestSeasonComparisonSummary {
  profitPerformanceAmount: number;
  profitPerformancePercentage: number | null;
  profitPerformanceStatus: HarvestComparisonStatus;
  costVarianceAmount: number;
  costVariancePercentage: number | null;
  costVarianceStatus: HarvestComparisonStatus;
}

export type HarvestPlanningSummary = HarvestSeasonPlanningSummary;
export type HarvestRealizedSummary = HarvestSeasonRealizedSummary;
export type HarvestProjectionSummary = HarvestSeasonProjectionSummary;
export interface HarvestComparisonSummary {
  profitPerformancePercentage: number | null;
  profitPerformanceStatus: HarvestComparisonStatus;
  costVarianceAmount: number;
  costVariancePercentage: number | null;
  costVarianceStatus: HarvestComparisonStatus;
}

export interface HarvestSeasonFinancialSummary {
  farmId: number;
  activeHarvestCount: number;
  planning: HarvestPlanningSummary;
  realized: HarvestRealizedSummary;
  projection: HarvestProjectionSummary;
  comparison: HarvestComparisonSummary;
  openAmounts: HarvestSeasonOpenAmountsSummary;
}

export interface HarvestSeasonPendingAmountsSummary {
  payableAmount: number;
  receivableAmount: number;
}

export interface HarvestSeasonOverdueAmountsSummary {
  payableAmount: number;
  receivableAmount: number;
}

export interface HarvestSeasonOpenAmountsSummary {
  payableAmount: number;
  receivableAmount: number;
  pending: HarvestSeasonPendingAmountsSummary;
  overdue: HarvestSeasonOverdueAmountsSummary;
}

export interface HarvestSeasonDetailSummary {
  harvestSeasonId: number;
  harvestSeasonName: string;
  productionActivityId: number;
  productionActivityName: string;
  farmId: number;
  farmName: string;
  areaHectares: number | null;
  planning: HarvestSeasonPlanningSummary;
  realized: HarvestSeasonRealizedSummary;
  projection: HarvestSeasonProjectionSummary;
  comparison: HarvestSeasonComparisonSummary;
  openAmounts: HarvestSeasonOpenAmountsSummary;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
}
