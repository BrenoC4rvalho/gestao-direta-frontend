export type FarmUserRole =
  | 'PRODUCER'
  | 'EMPLOYEE'
  | 'ACCOUNTANT'
  | 'INACTIVE'
  | string;

export interface FarmUser {
  id: number;
  farmId: number;
  farmName: string;
  userId: number;
  userName: string;
  userEmail: string;
  role: FarmUserRole;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFarmUserRequest {
  userId: number;
  role: FarmUserRole;
}

export interface UpdateFarmUserRoleRequest {
  role: FarmUserRole;
}
