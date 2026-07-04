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

export interface HarvestSeasonSummary {
  harvestSeasonId: number;
  harvestSeasonName: string;
  productionActivityId: number;
  productionActivityName: string;
  farmId: number;
  farmName: string;
  expectedCost: number;
  expectedRevenue: number;
  expectedProfit: number;
  realizedCost: number;
  realizedRevenue: number;
  realizedProfit: number;
  pendingExpenses: number;
  overdueExpenses: number;
  pendingRevenue: number;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  areaHectares: number | null;
  costPerHectare: number | null;
  revenuePerHectare: number | null;
  profitPerHectare: number | null;
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
  periodStart?: string | null;
  periodEnd?: string | null;
}
