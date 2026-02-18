// src/infrastructure/repositories/postgres_refresh_token_repository.integration.test.ts

import { Pool } from 'pg';
import { PostgresRefreshTokenRepository } from './postgres_refresh_token_repository.js';
import { CreateRefreshTokenDTO, RefreshToken } from '../../domain/refresh_token.js';
import { v4 as uuidv4 } from 'uuid';

describe('PostgresRefreshTokenRepository Integration Tests', () => {
    let repository: PostgresRefreshTokenRepository;
    const testPool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'orchestrator_test_db',
        password: process.env.DB_PASSWORD || 'postgres',
        port: parseInt(process.env.DB_PORT || '5432', 10),
    });

    beforeAll(async () => {
        repository = new PostgresRefreshTokenRepository(testPool);
        // Verify connection
        try {
            await testPool.query('SELECT NOW()');
        } catch (error) {
            console.error('Test database connection failed:', error);
            throw error;
        }

        // Must create parent user (and role probably) for foreign key constraints
        // Assuming user repository logic works, or manually inserting.
        // We need a user to associate tokens with.
        await testPool.query(`
            INSERT INTO roles (id, description) VALUES ('TEST_USER', 'Role for user')
            ON CONFLICT (id) DO NOTHING
        `);
    });

    beforeEach(async () => {
        // Clear tokens and users if needed for isolation, or just truncate tokens
        // Truncate users too, then reseed user. But keeping user consistent is easier for multiple tests.
        // Let's just create a unique user per test or one shared user.
        await testPool.query('TRUNCATE TABLE refresh_tokens, users RESTART IDENTITY CASCADE');

        // Re-seed shared user
        await testPool.query(`
            INSERT INTO users (id, email, password_hash, name, role_id) 
            VALUES ('u1', 'user@test.com', 'hash', 'Test User', 'TEST_USER')
        `);
    });

    afterAll(async () => {
        await testPool.end();
    });

    describe('create', () => {
        it('should create a refresh token', async () => {
            const token: CreateRefreshTokenDTO = {
                userId: 'u1',
                tokenHash: 'hash123',
                expiresAt: new Date(Date.now() + 1000 * 60 * 60), // +1 hour
                isRevoked: false,
                replacedBy: null
            };

            const created = await repository.create(token);
            expect(created).toBeDefined();
            expect(created.id).toBeDefined();
            expect(created.tokenHash).toBe(token.tokenHash);
            expect(created.userId).toBe('u1');

            const result = await testPool.query('SELECT * FROM refresh_tokens WHERE token_hash = $1', [token.tokenHash]);
            expect(result.rows).toHaveLength(1);
        });
    });

    describe('findByHash', () => {
        it('should find token by hash', async () => {
            const tokenId = uuidv4();
            const tokenHash = 'hash_to_find';
            await testPool.query(`
                INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
                VALUES ($1, 'u1', $2, NOW(), NOW())
            `, [tokenId, tokenHash]);

            const found = await repository.findByHash(tokenHash);
            expect(found).toBeDefined();
            expect(found?.id).toBe(tokenId);
        });

        it('should return null if hash not found', async () => {
            const found = await repository.findByHash('non_existent_hash');
            expect(found).toBeNull();
        });
    });

    describe('revoke', () => {
        it('should revoke a token by id', async () => {
            const tokenId = uuidv4();
            await testPool.query(`
                INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, is_revoked, created_at)
                VALUES ($1, 'u1', 'hash_revoke', NOW(), FALSE, NOW())
            `, [tokenId]);

            await repository.revoke(tokenId);

            const result = await testPool.query('SELECT is_revoked FROM refresh_tokens WHERE id = $1', [tokenId]);
            expect(result.rows[0].is_revoked).toBe(true);
        });
    });

    describe('revokeAllForUser', () => {
        it('should revoke all tokens for a user', async () => {
            await testPool.query(`
                INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, is_revoked, created_at)
                VALUES 
                ('t1', 'u1', 'h1', NOW(), FALSE, NOW()),
                ('t2', 'u1', 'h2', NOW(), FALSE, NOW())
            `);

            await repository.revokeAllForUser('u1');

            const result = await testPool.query('SELECT id, is_revoked FROM refresh_tokens WHERE user_id = $1', ['u1']);
            expect(result.rows).toHaveLength(2);
            expect(result.rows.every((r: any) => r.is_revoked === true)).toBe(true);
        });

        it('should not revoke other users tokens', async () => {
            // Create another user
            await testPool.query(`
                INSERT INTO users (id, email, password_hash, name, role_id) 
                VALUES ('u2', 'user2@test.com', 'hash', 'User 2', 'TEST_USER')
            `);
            await testPool.query(`
                INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, is_revoked, created_at)
                VALUES ('t3', 'u2', 'h3', NOW(), FALSE, NOW())
            `);

            await repository.revokeAllForUser('u1'); // Revoke u1 only

            const result = await testPool.query('SELECT is_revoked FROM refresh_tokens WHERE id = $1', ['t3']);
            expect(result.rows[0].is_revoked).toBe(false);
        });
    });

    describe('replace', () => {
        it('should revoke old token and set replacedBy', async () => {
            const oldId = 'old_token';
            const newHash = 'new_hash_123';

            await testPool.query(`
                INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, is_revoked, created_at)
                VALUES ($1, 'u1', 'old_hash', NOW(), FALSE, NOW())
            `, [oldId]);

            // Note: repository.replace only updates the OLD token. It doesn't create the new one (that's create's job).
            // It just marks old as replaced by new hash.
            await repository.replace(oldId, newHash);

            const result = await testPool.query('SELECT is_revoked, replaced_by FROM refresh_tokens WHERE id = $1', [oldId]);
            expect(result.rows[0].is_revoked).toBe(true);
            expect(result.rows[0].replaced_by).toBe(newHash);
        });
    });
});
