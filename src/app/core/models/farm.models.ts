import { PageRequest } from './page-response.model';

export type FarmStatus = 'ACTIVE' | 'INACTIVE' | string;

export type ProductionType = 'AGRICULTURE' | 'LIVESTOCK' | 'MIXED' | 'OTHER' | string;

export interface Farm {
  id: number;
  name: string;
  document: string | null;
  city: string | null;
  state: string | null;
  totalArea: number | null;
  productionType: ProductionType | null;
  status: FarmStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFarmRequest {
  name: string;
  document?: string | null;
  city?: string | null;
  state?: string | null;
  totalArea?: number | null;
  productionType?: ProductionType | null;
}

export interface UpdateFarmRequest {
  name: string;
  document?: string | null;
  city?: string | null;
  state?: string | null;
  totalArea?: number | null;
  productionType?: ProductionType | null;
}

export interface UpdateFarmStatusRequest {
  status: FarmStatus;
}

export interface FarmListParams extends PageRequest {
  search?: string | null;
  document?: string | null;
  productionType?: ProductionType | null;
  productionTypes?: ProductionType[] | null;
  status?: FarmStatus | null;
}
