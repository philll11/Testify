// src/domain/refresh_token.ts

export interface RefreshToken {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    isRevoked: boolean;
    replacedBy: string | null;
    createdAt: Date;
}

export type CreateRefreshTokenDTO = Omit<RefreshToken, 'id' | 'createdAt'>;
