import { AuthUser, UserStatus, UserType } from './auth.models';
import { PageRequest } from './page-response.model';

export interface User extends AuthUser {
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  document: string | null;
  userType: UserType;
}

export interface UpdateProfileRequest {
  name: string;
  document?: string | null;
}

export interface UpdateUserRequest {
  name: string;
  document?: string | null;
}

export interface UpdateUserStatusRequest {
  status: UserStatus;
}

export interface UpdateUserTypeRequest {
  userType: UserType;
}

export interface ResetUserPasswordRequest {
  newPassword: string;
}

export interface UserListParams extends PageRequest {
  search?: string | null;
  userType?: UserType | null;
  status?: UserStatus | null;
  statuses?: UserStatus[] | null;
}
