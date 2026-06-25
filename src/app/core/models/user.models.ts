import { AuthUser } from './auth.models';

export interface User extends AuthUser {
  createdAt: string;
  updatedAt: string;
}
