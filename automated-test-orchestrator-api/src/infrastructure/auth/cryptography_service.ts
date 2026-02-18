// src/infrastructure/auth/cryptography_service.ts

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { injectable } from 'inversify';
import { ICryptographyService } from '../../ports/i_cryptography_service.js';

@injectable()
export class CryptographyService implements ICryptographyService {
    private readonly SALT_ROUNDS = 10;

    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, this.SALT_ROUNDS);
    }

    async comparePassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    generateRandomToken(): string {
        return crypto.randomBytes(40).toString('hex');
    }
}
