export type TransactionType = 'INCOME' | 'EXPENSE' | string;

export type FinancialCategoryType = 'INCOME' | 'EXPENSE' | string;
export type FinancialCategoryFormType = 'INCOME' | 'EXPENSE';

export type FinancialCategoryStatus = 'ACTIVE' | 'INACTIVE' | string;

export interface FinancialCategory {
  id: number;
  name: string;
  type: FinancialCategoryType;
  color?: string | null;
  icon?: string | null;
  farmId: number;
  farmName?: string | null;
  status: FinancialCategoryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinancialCategoryRequest {
  name: string;
  type: FinancialCategoryFormType;
  farmId: number;
  color?: string | null;
  icon?: string | null;
}

export interface UpdateFinancialCategoryRequest {
  name: string;
  type: FinancialCategoryFormType;
  color?: string | null;
  icon?: string | null;
  status?: FinancialCategoryStatus;
}
