// src/application/auth_service.ts


import { injectable, inject } from 'inversify';
import { IAuthService } from '../ports/i_auth_service.js';
import { IUserRepository } from '../ports/i_user_repository.js';
import { IRefreshTokenRepository } from '../ports/i_refresh_token_repository.js';
import { ICryptographyService } from '../ports/i_cryptography_service.js';
import { IJwtService } from '../ports/i_jwt_service.js';
import { User } from '../domain/user.js';
import { RefreshToken, CreateRefreshTokenDTO } from '../domain/refresh_token.js';
import { TYPES } from '../inversify.types.js';
import { UnauthorizedError, ForbiddenError } from '../utils/app_error.js';

@injectable()
export class AuthService implements IAuthService {
    constructor(
        @inject(TYPES.IUserRepository) private userRepository: IUserRepository,
        @inject(TYPES.IRefreshTokenRepository) private refreshTokenRepository: IRefreshTokenRepository,
        @inject(TYPES.ICryptographyService) private cryptoService: ICryptographyService,
        @inject(TYPES.IJwtService) private jwtService: IJwtService
    ) { }

    async validateUser(email: string, password: string): Promise<User | null> {
        const user = await this.userRepository.findByEmail(email);
        if (!user) return null;

        const isValid = await this.cryptoService.comparePassword(password, user.passwordHash);
        if (!isValid) return null;

        return user;
    }

    async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
        const user = await this.validateUser(email, password);
        if (!user) {
            throw new UnauthorizedError('Invalid credentials');
        }

        if (!user.isActive || user.isDeleted) {
            throw new ForbiddenError('User is inactive or deleted');
        }

        const accessToken = this.jwtService.signAccessToken(user);
        const rawRefreshToken = this.cryptoService.generateRandomToken();
        const tokenHash = this.cryptoService.hashToken(rawRefreshToken);

        const refreshToken: CreateRefreshTokenDTO = {
            userId: user.id,
            tokenHash: tokenHash,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            isRevoked: false,
            replacedBy: null
        };

        await this.refreshTokenRepository.create(refreshToken);

        return { accessToken, refreshToken: rawRefreshToken };
    }

    async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        const tokenHash = this.cryptoService.hashToken(refreshToken);
        const storedToken = await this.refreshTokenRepository.findByHash(tokenHash);

        if (!storedToken) {
            throw new UnauthorizedError('Invalid refresh token');
        }

        if (storedToken.isRevoked) {
            // Token Reuse Detection > Invalidate all tokens for this user
            await this.refreshTokenRepository.revokeAllForUser(storedToken.userId);
            throw new ForbiddenError('SecurityError: Revoked token reuse detected. All sessions invalidated.');
        }

        if (storedToken.expiresAt < new Date()) {
            throw new UnauthorizedError('Refresh token expired');
        }

        const user = await this.userRepository.findById(storedToken.userId);
        if (!user) {
            throw new UnauthorizedError('User not found');
        }

        // Create NEW token
        const newRawRefreshToken = this.cryptoService.generateRandomToken();
        const newTokenHash = this.cryptoService.hashToken(newRawRefreshToken);

        const newAccessToken = this.jwtService.signAccessToken(user);
        const newRefreshToken: CreateRefreshTokenDTO = {
            userId: user.id,
            tokenHash: newTokenHash,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            isRevoked: false,
            replacedBy: null
        };

        const createdNewToken = await this.refreshTokenRepository.create(newRefreshToken);

        // Mark old token as revoked and replaced by new token hash
        await this.refreshTokenRepository.replace(storedToken.id, newTokenHash);

        return { accessToken: newAccessToken, refreshToken: newRawRefreshToken };
    }

    async logout(userId: string, refreshToken?: string): Promise<void> {
        await this.userRepository.incrementTokenVersion(userId);
        if (refreshToken) {
            const hash = this.cryptoService.hashToken(refreshToken);
            const token = await this.refreshTokenRepository.findByHash(hash);
            if (token) {
                await this.refreshTokenRepository.revoke(token.id);
            }
        }
    }
}
