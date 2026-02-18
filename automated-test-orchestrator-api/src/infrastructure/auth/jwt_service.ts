// src/infrastructure/auth/jwt_service.ts

import jwt from 'jsonwebtoken';
import { injectable, inject } from 'inversify';
import { IJwtService } from '../../ports/i_jwt_service.js';
import { User } from '../../domain/user.js';
import { IPlatformConfig } from '../../infrastructure/config.js';
import { TYPES } from '../../inversify.types.js';

@injectable()
export class JwtService implements IJwtService {
    private readonly secret: string;
    private readonly expiresIn: string | number = '15m';

    constructor(@inject(TYPES.IPlatformConfig) config: IPlatformConfig) {
        this.secret = config.jwtSecret || 'default_secret_change_in_production';
    }

    signAccessToken(user: User): string {
        const payload = {
            sub: user.id,
            role: user.roleId,
            version: user.tokenVersion,
        };
        return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn as any });
    }

    verifyAccessToken(token: string): any {
        try {
            return jwt.verify(token, this.secret);
        } catch (error) {
            throw new Error('Invalid token');
        }
    }
}
