// src/domain/user.ts

export interface User {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    roleId: string;
    tokenVersion: number;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type CreateUserDTO = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'tokenVersion' | 'roleId'> & {
    roleId?: string;
    tokenVersion?: number;
};

export type UpdateUserDTO = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;
