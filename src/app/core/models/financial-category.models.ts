export type TransactionType = 'INCOME' | 'EXPENSE' | string;

export type FinancialCategoryType = 'INCOME' | 'EXPENSE' | 'GLOBAL' | string;
export type FinancialCategoryFormType = 'INCOME' | 'EXPENSE';

export type FinancialCategoryStatus = 'ACTIVE' | 'INACTIVE' | string;

export interface FinancialCategory {
  id: number;
  name: string;
  type: FinancialCategoryType;
  color?: string | null;
  icon?: string | null;
  farmId: number | null;
  farmName?: string | null;
  status: FinancialCategoryStatus;
  defaultCategory?: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinancialCategoryRequest {
  name: string;
  type: FinancialCategoryFormType;
  farmId?: number | null;
  isDefault?: boolean;
  color?: string | null;
  icon?: string | null;
}

export interface UpdateFinancialCategoryRequest {
  name: string;
  type: FinancialCategoryType;
  farmId?: number | null;
  isDefault?: boolean;
  color?: string | null;
  icon?: string | null;
  status?: FinancialCategoryStatus;
}

export function isGlobalCategory(category: FinancialCategory): boolean {
  return (
    category.farmId === null ||
    category.defaultCategory === true ||
    category.isDefault === true
  );
}
