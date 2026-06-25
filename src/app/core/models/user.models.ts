import { AuthUser, UserType } from './auth.models';

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
