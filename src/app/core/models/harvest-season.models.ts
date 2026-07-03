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
