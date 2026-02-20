import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export interface EncryptedData {
    content: string;
    iv: string;
    tag: string;
}

@Injectable()
export class EncryptionService implements OnModuleInit {
    private readonly algorithm = 'aes-256-gcm';
    private key: Buffer;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        const keyString = this.configService.get<string>('ENCRYPTION_KEY');
        if (!keyString) {
            throw new Error('ENCRYPTION_KEY must be defined in environment variables');
        }

        // Expecting a 32-byte hex string
        this.key = Buffer.from(keyString, 'hex');
        if (this.key.length !== 32) {
            throw new Error('ENCRYPTION_KEY must be a 32-byte hex string');
        }
    }

    encrypt(text: string): EncryptedData {
        const iv = randomBytes(16);
        const cipher = createCipheriv(this.algorithm, this.key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const tag = cipher.getAuthTag();

        return {
            content: encrypted,
            iv: iv.toString('hex'),
            tag: tag.toString('hex'),
        };
    }

    decrypt(data: EncryptedData): string {
        const iv = Buffer.from(data.iv, 'hex');
        const tag = Buffer.from(data.tag, 'hex');
        const decipher = createDecipheriv(this.algorithm, this.key, iv);

        decipher.setAuthTag(tag);

        let decrypted = decipher.update(data.content, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
}
