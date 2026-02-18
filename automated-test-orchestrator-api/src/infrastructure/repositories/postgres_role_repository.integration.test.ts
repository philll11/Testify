// src/infrastructure/repositories/postgres_role_repository.integration.test.ts

import { Pool } from 'pg';
import { PostgresRoleRepository } from './postgres_role_repository.js';
import { CreateRoleDTO, UpdateRoleDTO, Role } from '../../domain/role.js';
import { v4 as uuidv4 } from 'uuid';

describe('PostgresRoleRepository Integration Tests', () => {
    let repository: PostgresRoleRepository;
    const testPool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'orchestrator_test_db',
        password: process.env.DB_PASSWORD || 'postgres',
        port: parseInt(process.env.DB_PORT || '5432', 10),
    });

    beforeAll(async () => {
        repository = new PostgresRoleRepository(testPool);
        // Verify the connection
        try {
            await testPool.query('SELECT NOW()');
        } catch (error) {
            console.error('Test database connection failed:', error);
            throw error;
        }
    });

    beforeEach(async () => {
        // Clear tables
        await testPool.query('TRUNCATE TABLE role_permissions, roles RESTART IDENTITY CASCADE');

        // Seed initial permissions if they don't exist (assuming permissions table logic exists elsewhere or we need to insert them for FKs)
        // Since permissions table is likely static or managed, we might need to insert dummy permissions if the table is empty.
        // However, usually permissions are seeded. Let's insert some test permissions just in case.
        await testPool.query(`
            INSERT INTO permissions (id, description) VALUES 
            ('perm:read', 'Read permission'),
            ('perm:write', 'Write permission')
            ON CONFLICT (id) DO NOTHING
        `);
    });

    afterAll(async () => {
        await testPool.end();
    });

    describe('create', () => {
        it('should create a new role', async () => {
            const newRole: CreateRoleDTO = {
                name: 'TEST_ROLE',
                description: 'A test role'
            };

            const created = await repository.create(newRole);
            expect(created).toEqual(expect.objectContaining({
                name: 'TEST_ROLE',
                description: 'A test role'
            }));
            expect(created.id).toBeDefined();

            const result = await testPool.query('SELECT * FROM roles WHERE name = $1', ['TEST_ROLE']);
            expect(result.rows).toHaveLength(1);
        });
    });

    describe('findById', () => {
        it('should find a role by id', async () => {
            const roleId = uuidv4();
            await testPool.query("INSERT INTO roles (id, name, description) VALUES ($1, 'FIND_ME', 'Description')", [roleId]);

            const role = await repository.findById(roleId);
            expect(role).toBeDefined();
            expect(role?.id).toBe(roleId);
            expect(role?.name).toBe('FIND_ME');
            expect(role?.description).toBe('Description');
        });

        it('should return null if role not found', async () => {
            const role = await repository.findById(uuidv4());
            expect(role).toBeNull();
        });
    });

    describe('update', () => {
        it('should update an existing role', async () => {
            const roleId = uuidv4();
            await testPool.query("INSERT INTO roles (id, name, description) VALUES ($1, 'UPDATE_ME', 'Original')", [roleId]);

            const roleToUpdate: UpdateRoleDTO = {
                description: 'Updated Description'
            };

            const updated = await repository.update(roleId, roleToUpdate);
            expect(updated.description).toBe('Updated Description');

            const result = await testPool.query('SELECT * FROM roles WHERE id = $1', [roleId]);
            expect(result.rows[0].description).toBe('Updated Description');
        });

        it('should throw error if role to update does not exist', async () => {
            const roleId = uuidv4();
            const roleToUpdate: UpdateRoleDTO = {
                description: 'Ghost'
            };
            await expect(repository.update(roleId, roleToUpdate)).rejects.toThrow();
        });
    });

    describe('delete', () => {
        it('should delete a role', async () => {
            const roleId = uuidv4();
            await testPool.query("INSERT INTO roles (id, name, description) VALUES ($1, 'DELETE_ME', 'Desc')", [roleId]);

            await repository.delete(roleId);

            const result = await testPool.query('SELECT * FROM roles WHERE id = $1', [roleId]);
            expect(result.rows).toHaveLength(0);
        });
    });

    describe('findAll', () => {
        it('should return all roles', async () => {
            await testPool.query("INSERT INTO roles (id, description) VALUES ('ROLE_1', 'One'), ('ROLE_2', 'Two')");

            const roles = await repository.findAll();
            expect(roles.length).toBeGreaterThanOrEqual(2);
            expect(roles.some(r => r.id === 'ROLE_1')).toBe(true);
            expect(roles.some(r => r.id === 'ROLE_2')).toBe(true);
        });
    });

    describe('Permissions Management', () => {
        const roleId = 'PERM_ROLE';

        beforeEach(async () => {
            await testPool.query("INSERT INTO roles (id, description) VALUES ($1, 'Role for perms')", [roleId]);
        });

        it('should set and get permissions for a role', async () => {
            const perms = ['perm:read', 'perm:write'];
            await repository.setPermissions(roleId, perms);

            const fetchedPerms = await repository.getPermissions(roleId);
            expect(fetchedPerms).toHaveLength(2);
            expect(fetchedPerms).toContain('perm:read');
            expect(fetchedPerms).toContain('perm:write');
        });

        it('should overwrite permissions when setting again', async () => {
            await repository.setPermissions(roleId, ['perm:read']);
            let fetchedPerms = await repository.getPermissions(roleId);
            expect(fetchedPerms).toEqual(['perm:read']);

            await repository.setPermissions(roleId, ['perm:write']);
            fetchedPerms = await repository.getPermissions(roleId);
            expect(fetchedPerms).toEqual(['perm:write']);
        });

        it('should clear permissions when setting empty array', async () => {
            await repository.setPermissions(roleId, ['perm:read']);
            await repository.setPermissions(roleId, []);

            const fetchedPerms = await repository.getPermissions(roleId);
            expect(fetchedPerms).toHaveLength(0);
        });
    });
});
