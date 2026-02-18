// src/domain/role.ts

export interface Role {
    id: string;
    name: string; // Semantic ID (e.g., 'ADMIN', 'VIEWER')
    description: string;
    createdAt: Date;
}

export type CreateRoleDTO = Omit<Role, 'id' | 'createdAt'>;

export type UpdateRoleDTO = Partial<Omit<Role, 'id' | 'createdAt'>>;
