import { BaseEntity } from 'types/models';

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
}

export interface User extends BaseEntity {
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  roleId?: string;
  role?: { id: string; name: string; recordId: string; permissions: string[] }; // Add role property for populated data
  preferences?: UserPreferences;
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  roleId?: string;
  preferences?: UserPreferences;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  roleId?: string;
  isActive?: boolean;
  preferences?: UserPreferences;
}
