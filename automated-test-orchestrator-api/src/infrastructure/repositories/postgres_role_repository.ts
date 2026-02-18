// src/infrastructure/repositories/postgres_role_repository.ts

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { IRoleRepository } from '../../ports/i_role_repository.js';
import { Role, CreateRoleDTO, UpdateRoleDTO } from '../../domain/role.js';
import { TYPES } from '../../inversify.types.js';

@injectable()
export class PostgresRoleRepository implements IRoleRepository {
    constructor(@inject(TYPES.PostgresPool) private pool: Pool) { }

    async create(role: CreateRoleDTO): Promise<Role> {
        const query = `
      INSERT INTO roles (name, description, created_at)
      VALUES ($1, $2, DEFAULT)
      RETURNING *
    `;
        const values = [role.name, role.description];
        const result = await this.pool.query(query, values);
        return this.mapRowToRole(result.rows[0]);
    }

    async update(id: string, role: UpdateRoleDTO): Promise<Role> {
        const setClauses: string[] = [];
        const values: any[] = [id];
        let paramIndex = 2;

        if (role.description !== undefined) {
            setClauses.push(`description = $${paramIndex++}`);
            values.push(role.description);
        }

        if (setClauses.length === 0) {
            const existing = await this.findById(id);
            if (!existing) throw new Error(`Role with ID ${id} not found`);
            return existing;
        }

        const query = `
      UPDATE roles 
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
        const result = await this.pool.query(query, values);
        if (result.rows.length === 0) throw new Error(`Role with ID ${id} not found`);
        return this.mapRowToRole(result.rows[0]);
    }

    async delete(id: string): Promise<void> {
        await this.pool.query('DELETE FROM roles WHERE id = $1', [id]);
    }

    async findById(id: string): Promise<Role | null> {
        const result = await this.pool.query('SELECT * FROM roles WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;
        return this.mapRowToRole(result.rows[0]);
    }

    async findAll(): Promise<Role[]> {
        const result = await this.pool.query('SELECT * FROM roles');
        return result.rows.map(this.mapRowToRole);
    }

    async getPermissions(roleId: string): Promise<string[]> {
        const query = `
      SELECT permission_id FROM role_permissions WHERE role_id = $1
    `;
        const result = await this.pool.query(query, [roleId]);
        return result.rows.map((row: any) => row.permission_id);
    }

    async setPermissions(roleId: string, permissionIds: string[]): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

            if (permissionIds.length > 0) {
                const values: string[] = [];
                const placeholders: string[] = [];
                let index = 1;
                permissionIds.forEach((permId) => {
                    values.push(roleId, permId);
                    placeholders.push(`($${index}, $${index + 1})`);
                    index += 2;
                });

                const query = `INSERT INTO role_permissions (role_id, permission_id) VALUES ${placeholders.join(', ')}`;
                await client.query(query, values);
            }

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    private mapRowToRole(row: any): Role {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at
        };
    }
}
