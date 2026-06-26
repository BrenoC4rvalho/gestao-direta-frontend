import type { FarmUserRole } from './farm-user.models';

export interface FarmAccessPermissions {
  canViewFarm: boolean;
  canEditFarm: boolean;
  canChangeFarmStatus: boolean;
  canManageFarmUsers: boolean;
  canViewFinancial: boolean;
  canManageTransactions: boolean;
  canManageCategories: boolean;
  canManageGlobalCategories: boolean;
  canCreateFarm: boolean;
}

export interface FarmAccessResponse {
  farmId: number;
  farmName: string;
  userId: number;
  userType: 'ADMIN' | 'USER' | string;
  role: FarmUserRole | null;
  permissions: FarmAccessPermissions;
}

export const NO_FARM_ACCESS_PERMISSIONS: FarmAccessPermissions = {
  canViewFarm: false,
  canEditFarm: false,
  canChangeFarmStatus: false,
  canManageFarmUsers: false,
  canViewFinancial: false,
  canManageTransactions: false,
  canManageCategories: false,
  canManageGlobalCategories: false,
  canCreateFarm: false,
};
