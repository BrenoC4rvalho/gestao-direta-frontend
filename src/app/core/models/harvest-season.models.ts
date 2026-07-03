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
