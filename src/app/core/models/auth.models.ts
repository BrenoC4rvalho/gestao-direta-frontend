export interface LoginRequest {
  email: string;
  password: string;
}

export type UserType = 'ADMIN' | 'USER' | string;
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | string;

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  document: string | null;
  userType: UserType;
  status: UserStatus;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}
