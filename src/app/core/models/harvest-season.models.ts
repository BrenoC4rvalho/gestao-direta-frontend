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
  plannedCostPerHectare: number | null;
  plannedRevenuePerHectare: number | null;
  plannedResultPerHectare: number | null;
  projectedCostPerHectare: number | null;
  projectedRevenuePerHectare: number | null;
  projectedProfitPerHectare: number | null;
  realizedCostPerHectare: number | null;
  realizedRevenuePerHectare: number | null;
  realizedProfitPerHectare: number | null;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
}

export type HarvestSeasonComparisonSemantic = 'BETTER' | 'WORSE' | 'NEUTRAL';

export type HarvestSeasonComparisonMetric =
  | 'AREA_HECTARES'
  | 'PLANNED_COST'
  | 'PLANNED_REVENUE'
  | 'PLANNED_RESULT'
  | 'PLANNED_MARGIN'
  | 'PROJECTED_COST'
  | 'PROJECTED_REVENUE'
  | 'PROJECTED_PROFIT'
  | 'PROJECTED_MARGIN'
  | 'REALIZED_COST'
  | 'REALIZED_REVENUE'
  | 'REALIZED_PROFIT'
  | 'REALIZED_MARGIN'
  | 'PLANNED_COST_PER_HECTARE'
  | 'PLANNED_REVENUE_PER_HECTARE'
  | 'PLANNED_RESULT_PER_HECTARE'
  | 'PROJECTED_COST_PER_HECTARE'
  | 'PROJECTED_REVENUE_PER_HECTARE'
  | 'PROJECTED_PROFIT_PER_HECTARE'
  | 'REALIZED_COST_PER_HECTARE'
  | 'REALIZED_REVENUE_PER_HECTARE'
  | 'REALIZED_PROFIT_PER_HECTARE';

export interface HarvestSeasonPerHectareComparison {
  plannedCostPerHectare: number | null;
  plannedRevenuePerHectare: number | null;
  plannedResultPerHectare: number | null;
  projectedCostPerHectare: number | null;
  projectedRevenuePerHectare: number | null;
  projectedProfitPerHectare: number | null;
  realizedCostPerHectare: number | null;
  realizedRevenuePerHectare: number | null;
  realizedProfitPerHectare: number | null;
}

export interface HarvestSeasonComparisonHarvest {
  id: number;
  name: string;
  status: HarvestSeasonStatus;
  productionActivityName: string;
  startDate: string;
  endDate: string | null;
  areaHectares: number | null;
  planning: HarvestSeasonPlanningSummary | null;
  projection: HarvestSeasonProjectionSummary | null;
  realized: HarvestSeasonRealizedSummary | null;
  perHectare: HarvestSeasonPerHectareComparison;
}

export interface HarvestSeasonComparisonDifference {
  metric: HarvestSeasonComparisonMetric;
  difference: number | null;
  percentageDifference: number | null;
  semantic: HarvestSeasonComparisonSemantic | null;
}

export interface HarvestSeasonComparison {
  harvestA: HarvestSeasonComparisonHarvest;
  harvestB: HarvestSeasonComparisonHarvest;
  differences: HarvestSeasonComparisonDifference[];
  highlights: HarvestSeasonComparisonDifference[];
}
