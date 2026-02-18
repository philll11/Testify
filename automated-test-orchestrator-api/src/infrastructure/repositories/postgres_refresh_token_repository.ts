// src/infrastructure/repositories/postgres_refresh_token_repository.ts

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { IRefreshTokenRepository } from '../../ports/i_refresh_token_repository.js';
import { RefreshToken, CreateRefreshTokenDTO } from '../../domain/refresh_token.js';
import { TYPES } from '../../inversify.types.js';

@injectable()
export class PostgresRefreshTokenRepository implements IRefreshTokenRepository {
    constructor(@inject(TYPES.PostgresPool) private pool: Pool) { }

    async create(token: CreateRefreshTokenDTO): Promise<RefreshToken> {
        const query = `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at, is_revoked, replaced_by, created_at)
      VALUES ($1, $2, $3, $4, $5, DEFAULT)
      RETURNING *
    `;
        const values = [
            token.userId,
            token.tokenHash,
            token.expiresAt,
            token.isRevoked,
            token.replacedBy
        ];
        const result = await this.pool.query(query, values);
        return this.mapRowToToken(result.rows[0]);
    }

    async findByHash(hash: string): Promise<RefreshToken | null> {
        const result = await this.pool.query('SELECT * FROM refresh_tokens WHERE token_hash = $1', [hash]);
        if (result.rows.length === 0) return null;
        return this.mapRowToToken(result.rows[0]);
    }

    async revoke(id: string): Promise<void> {
        await this.pool.query('UPDATE refresh_tokens SET is_revoked = TRUE WHERE id = $1', [id]);
    }

    async revokeAllForUser(userId: string): Promise<void> {
        await this.pool.query('UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1', [userId]);
    }

    async replace(oldTokenId: string, newTokenHash: string): Promise<void> {
        await this.pool.query(
            'UPDATE refresh_tokens SET is_revoked = TRUE, replaced_by = $2 WHERE id = $1',
            [oldTokenId, newTokenHash]
        );
    }

    private mapRowToToken(row: any): RefreshToken {
        return {
            id: row.id,
            userId: row.user_id,
            tokenHash: row.token_hash,
            expiresAt: row.expires_at,
            isRevoked: row.is_revoked,
            replacedBy: row.replaced_by,
            createdAt: row.created_at
        };
    }
}
