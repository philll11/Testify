// src/ports/i_role_repository.ts

import { Role, CreateRoleDTO, UpdateRoleDTO } from '../domain/role.js';

export interface IRoleRepository {
    create(role: CreateRoleDTO): Promise<Role>;
    update(id: string, role: UpdateRoleDTO): Promise<Role>;
    delete(id: string): Promise<void>;
    findById(id: string): Promise<Role | null>;
    findAll(): Promise<Role[]>;
    getPermissions(roleId: string): Promise<string[]>;
    setPermissions(roleId: string, permissionIds: string[]): Promise<void>;
}
