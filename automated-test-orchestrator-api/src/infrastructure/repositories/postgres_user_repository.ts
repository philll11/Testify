// src/infrastructure/repositories/postgres_user_repository.ts

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { IUserRepository } from '../../ports/i_user_repository.js';
import { User, CreateUserDTO, UpdateUserDTO } from '../../domain/user.js';
import { TYPES } from '../../inversify.types.js';

@injectable()
export class PostgresUserRepository implements IUserRepository {
    constructor(@inject(TYPES.PostgresPool) private pool: Pool) { }

    async findByEmail(email: string): Promise<User | null> {
        const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return null;
        return this.mapRowToUser(result.rows[0]);
    }

    async findById(id: string): Promise<User | null> {
        const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;
        return this.mapRowToUser(result.rows[0]);
    }

    async create(user: CreateUserDTO): Promise<User> {
        const query = `
      INSERT INTO users (email, password_hash, name, role_id, token_version, is_active, is_deleted)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
        const values = [
            user.email,
            user.passwordHash,
            user.name,
            user.roleId ?? null,
            user.tokenVersion ?? 0,
            user.isActive,
            user.isDeleted
        ];
        const result = await this.pool.query(query, values);
        return this.mapRowToUser(result.rows[0]);
    }

    async update(id: string, user: UpdateUserDTO): Promise<User> {
        const setClauses: string[] = [];
        const values: any[] = [id];
        let paramIndex = 2;

        if (user.email !== undefined) { setClauses.push(`email = $${paramIndex++}`); values.push(user.email); }
        if (user.passwordHash !== undefined) { setClauses.push(`password_hash = $${paramIndex++}`); values.push(user.passwordHash); }
        if (user.name !== undefined) { setClauses.push(`name = $${paramIndex++}`); values.push(user.name); }
        if (user.roleId !== undefined) { setClauses.push(`role_id = $${paramIndex++}`); values.push(user.roleId); }
        if (user.tokenVersion !== undefined) { setClauses.push(`token_version = $${paramIndex++}`); values.push(user.tokenVersion); }
        if (user.isActive !== undefined) { setClauses.push(`is_active = $${paramIndex++}`); values.push(user.isActive); }
        if (user.isDeleted !== undefined) { setClauses.push(`is_deleted = $${paramIndex++}`); values.push(user.isDeleted); }

        if (setClauses.length === 0) {
            const existing = await this.findById(id);
            if (!existing) throw new Error(`User with id ${id} not found`);
            return existing;
        }

        setClauses.push(`updated_at = NOW()`);

        const query = `
      UPDATE users 
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
        const result = await this.pool.query(query, values);
        if (result.rows.length === 0) {
            throw new Error(`User with id ${id} not found`);
        }
        return this.mapRowToUser(result.rows[0]);
    }

    async incrementTokenVersion(id: string): Promise<void> {
        await this.pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [id]);
    }

    private mapRowToUser(row: any): User {
        return {
            id: row.id,
            email: row.email,
            passwordHash: row.password_hash,
            name: row.name,
            roleId: row.role_id,
            tokenVersion: row.token_version,
            isActive: row.is_active,
            isDeleted: row.is_deleted,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
