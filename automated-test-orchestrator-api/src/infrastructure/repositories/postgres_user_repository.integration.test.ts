// src/infrastructure/repositories/postgres_user_repository.integration.test.ts

import { Pool } from 'pg';
import { PostgresUserRepository } from './postgres_user_repository.js';
import { CreateUserDTO, UpdateUserDTO, User } from '../../domain/user.js';
import { v4 as uuidv4 } from 'uuid';

describe('PostgresUserRepository Integration Tests', () => {
    let repository: PostgresUserRepository;
    const testPool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'orchestrator_test_db',
        password: process.env.DB_PASSWORD || 'postgres',
        port: parseInt(process.env.DB_PORT || '5432', 10),
    });

    beforeAll(async () => {
        repository = new PostgresUserRepository(testPool);
        // Ensure connection works
        try {
            await testPool.query('SELECT NOW()');
        } catch (error) {
            console.error('Test database connection failed:', error);
            throw error;
        }

        // Seed roles required for user creation (e.g., 'VIEWER' as default)
        await testPool.query(`
            INSERT INTO roles (id, description) VALUES ('VIEWER', 'Default viewer role')
            ON CONFLICT (id) DO NOTHING
        `);
    });

    beforeEach(async () => {
        // Clear users table before each test
        await testPool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
        // Re-ensure role exists if truncated (though users usually cascade delete refresh tokens, not roles)
        // Roles are semi-static, so we don't truncate them often unless we test roles specifically. 
        // But if previous tests truncated roles, we need to ensure they are there.
        await testPool.query(`
            INSERT INTO roles (id, description) VALUES ('VIEWER', 'Default viewer role')
            ON CONFLICT (id) DO NOTHING
        `);
    });

    afterAll(async () => {
        await testPool.end();
    });

    describe('create', () => {
        it('should create a new user', async () => {
            const newUser: CreateUserDTO = {
                email: 'test@example.com',
                passwordHash: 'hashedpassword',
                name: 'Test User',
                roleId: 'VIEWER',
                tokenVersion: 0,
                isActive: true,
                isDeleted: false
            };

            const createdUser = await repository.create(newUser);
            expect(createdUser).toBeDefined();
            expect(createdUser.id).toBeDefined();
            expect(createdUser.email).toBe('test@example.com');
            expect(createdUser.roleId).toBe('VIEWER');

            const result = await testPool.query('SELECT * FROM users WHERE email = $1', ['test@example.com']);
            expect(result.rows).toHaveLength(1);
        });
    });

    describe('findByEmail', () => {
        it('should find execution results by id', async () => {
            await testPool.query(`
                INSERT INTO users (email, password_hash, name, role_id) 
                VALUES ('findme@example.com', 'hash', 'Finder', 'VIEWER')
            `);

            const user = await repository.findByEmail('findme@example.com');
            expect(user).toBeDefined();
            expect(user?.email).toBe('findme@example.com');
        });

        it('should return null if not found', async () => {
            const user = await repository.findByEmail('nonexistent@example.com');
            expect(user).toBeNull();
        });
    });

    describe('findById', () => {
        it('should find user by id', async () => {
            const id = uuidv4();
            await testPool.query(`
                INSERT INTO users (id, email, password_hash, name, role_id) 
                VALUES ($1, 'id@example.com', 'hash', 'ID User', 'VIEWER')
            `, [id]);

            const user = await repository.findById(id);
            expect(user).toBeDefined();
            expect(user?.id).toBe(id);
        });
    });

    describe('update', () => {
        it('should update user details', async () => {
            const id = uuidv4();
            await testPool.query(`
                INSERT INTO users (id, email, password_hash, name, role_id) 
                VALUES ($1, 'update@example.com', 'hash', 'Original Name', 'VIEWER')
            `, [id]);

            const userToUpdate: UpdateUserDTO = {
                email: 'update@example.com',
                passwordHash: 'newhash',
                name: 'Updated Name',
                roleId: 'VIEWER',
                tokenVersion: 1,
                isActive: false,
                isDeleted: false
            };

            const updated = await repository.update(id, userToUpdate);
            expect(updated.name).toBe('Updated Name');
            expect(updated.passwordHash).toBe('newhash');
            expect(updated.tokenVersion).toBe(1);
            expect(updated.isActive).toBe(false);

            const result = await testPool.query('SELECT * FROM users WHERE id = $1', [id]);
            expect(result.rows[0].name).toBe('Updated Name');
        });
    });

    describe('incrementTokenVersion', () => {
        it('should increment token version', async () => {
            const id = uuidv4();
            await testPool.query(`
                INSERT INTO users (id, email, password_hash, name, role_id, token_version) 
                VALUES ($1, 'token@example.com', 'hash', 'Token User', 'VIEWER', 0)
            `, [id]);

            await repository.incrementTokenVersion(id);

            const result = await testPool.query('SELECT token_version FROM users WHERE id = $1', [id]);
            expect(result.rows[0].token_version).toBe(1);

            await repository.incrementTokenVersion(id);
            const result2 = await testPool.query('SELECT token_version FROM users WHERE id = $1', [id]);
            expect(result2.rows[0].token_version).toBe(2);
        });
    });
});
