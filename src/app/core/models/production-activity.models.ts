import { PageRequest } from './page-response.model';

export type ProductionActivityStatus = 'ACTIVE' | 'INACTIVE';

export interface ProductionActivity {
  id: number;
  name: string;
  description?: string | null;
  status: ProductionActivityStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductionActivityRequest {
  name: string;
  description?: string | null;
}

export interface UpdateProductionActivityRequest {
  name: string;
  description?: string | null;
}

export interface ProductionActivityListParams extends PageRequest {
  status?: ProductionActivityStatus | null;
}
