import { PageRequest } from './page-response.model';

export type ProductionActivityStatus = 'ACTIVE' | 'INACTIVE';

export interface ProductionActivity {
  id: number;
  farmId: number;
  farmName?: string | null;
  name: string;
  description?: string | null;
  status: ProductionActivityStatus | string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateProductionActivityRequest {
  farmId: number;
  name: string;
  description?: string | null;
}

export interface UpdateProductionActivityRequest {
  name: string;
  description?: string | null;
}

export interface ProductionActivityListParams extends PageRequest {
  farmId: number;
  search?: string | null;
  status?: ProductionActivityStatus | null;
  includeInactive?: boolean | null;
}
