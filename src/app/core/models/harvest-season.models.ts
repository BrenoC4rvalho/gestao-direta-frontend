import { PageRequest } from './page-response.model';
import { FinancialAmountSummary } from './financial.models';

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

export interface CreateHarvestSeasonRequest {
  farmId: number;
  productionActivityId: number;
  name: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  expectedRevenue?: number | null;
  expectedCost?: number | null;
  areaHectares?: number | null;
}

export interface UpdateHarvestSeasonRequest {
  productionActivityId: number;
  name: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  expectedRevenue?: number | null;
  expectedCost?: number | null;
  areaHectares?: number | null;
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
  status?: HarvestSeasonStatus | null;
  statuses?: HarvestSeasonStatus[] | null;
  productionActivityId?: number | null;
  productionActivityIds?: number[] | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface HarvestSeasonFilters {
  farmId: number;
  search?: string | null;
  statuses?: HarvestSeasonStatus[] | null;
  productionActivityIds?: number[] | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface HarvestPlanningSummary {
  plannedCost: number;
  plannedRevenue: number;
  plannedProfit: number;
}

export interface HarvestRealizedSummary {
  realizedCost: number;
  realizedRevenue: number;
  realizedProfit: number;
}

export interface HarvestProjectionSummary {
  projectedCost: number;
  projectedRevenue: number;
  projectedProfit: number;
}

export type HarvestComparisonStatus =
  'ABOVE_PLANNED' | 'BELOW_PLANNED' | 'ON_TARGET' | 'NOT_APPLICABLE' | string;

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
}

export interface HarvestSeasonOpenAmountsSummary {
  payable: FinancialAmountSummary;
  receivable: FinancialAmountSummary;
  overduePayable: FinancialAmountSummary;
  overdueReceivable: FinancialAmountSummary;
}

export interface HarvestSeasonDetailSummary {
  planning: HarvestPlanningSummary;
  realized: HarvestRealizedSummary;
  projection: HarvestProjectionSummary;
  comparison: HarvestComparisonSummary;
  openAmounts: HarvestSeasonOpenAmountsSummary;
  transactionCount: number;
}
