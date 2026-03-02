import { BaseEntity } from 'types/models';

export interface Role extends BaseEntity {
  name: string;
  description?: string;
  permissions: string[];
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  permissions?: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
}
