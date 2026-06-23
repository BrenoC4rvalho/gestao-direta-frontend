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
