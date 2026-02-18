// src/ports/i_refresh_token_repository.ts

import { RefreshToken, CreateRefreshTokenDTO } from '../domain/refresh_token.js';

export interface IRefreshTokenRepository {
    create(token: CreateRefreshTokenDTO): Promise<RefreshToken>;
    findByHash(hash: string): Promise<RefreshToken | null>;
    revoke(id: string): Promise<void>;
    revokeAllForUser(userId: string): Promise<void>;
    replace(oldTokenId: string, newTokenHash: string): Promise<void>;
}
