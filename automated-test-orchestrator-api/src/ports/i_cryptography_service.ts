// src/ports/i_cryptography_service.ts

export interface ICryptographyService {
    hashPassword(password: string): Promise<string>;
    comparePassword(password: string, hash: string): Promise<boolean>;
    hashToken(token: string): string;
    generateRandomToken(): string;
}
