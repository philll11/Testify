import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserIntegrationCredential, IntegrationPlatform } from './entities/user-integration-credential.entity';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { CredentialResponseDto } from './dto/credential-response.dto';

@Injectable()
export class UserCredentialsService {
    constructor(
        @InjectRepository(UserIntegrationCredential)
        private readonly credentialsRepository: Repository<UserIntegrationCredential>,
        private readonly encryptionService: EncryptionService,
    ) { }

    async create(userId: string, dto: CreateCredentialDto): Promise<CredentialResponseDto> {
        const payload = JSON.stringify({
            accountId: dto.accountId,
            username: dto.username,
            passwordOrToken: dto.passwordOrToken,
            executionInstanceId: dto.executionInstanceId,
        });

        const encrypted = this.encryptionService.encrypt(payload);

        const credential = this.credentialsRepository.create({
            userId,
            platformName: dto.platform || IntegrationPlatform.BOOMI,
            profileName: dto.profileName,
            encryptedData: encrypted.content,
            iv: encrypted.iv,
            authTag: encrypted.tag,
        });

        const saved = await this.credentialsRepository.save(credential);

        return new CredentialResponseDto({
            id: saved.id,
            platform: saved.platformName,
            profileName: saved.profileName,
            accountId: dto.accountId,
            username: dto.username,
            executionInstanceId: dto.executionInstanceId,
        });
    }

    async findAll(userId: string): Promise<CredentialResponseDto[]> {
        const credentials = await this.credentialsRepository.find({
            where: { userId },
        });

        return credentials.map((c) => {
            let decrypted: any = {};
            try {
                const decryptedContent = this.encryptionService.decrypt({
                    content: c.encryptedData,
                    iv: c.iv,
                    tag: c.authTag,
                });
                decrypted = JSON.parse(decryptedContent);
            } catch (error) {
                // If decryption fails, return partial info or throw error?
                // For now, log error and return partial, or empty decrypted fields
                console.error(`Failed to decrypt credential ${c.id}`, error);
            }

            return new CredentialResponseDto({
                id: c.id,
                platform: c.platformName,
                profileName: c.profileName,
                accountId: decrypted.accountId,
                username: decrypted.username,
                executionInstanceId: decrypted.executionInstanceId,
            });
        });
    }

    async remove(userId: string, credentialId: string): Promise<void> {
        const credential = await this.credentialsRepository.findOne({
            where: { id: credentialId, userId },
        });

        if (!credential) {
            throw new NotFoundException(`Credential with ID ${credentialId} not found`);
        }

        await this.credentialsRepository.remove(credential);
    }

    // Internal method to retrieve decrypted credentials for use by other services (like Integration Factory)
    async getDecryptedCredential(userId: string, profileName: string): Promise<any> {
        const credential = await this.credentialsRepository.findOne({
            where: { userId, profileName },
        });

        if (!credential) {
            throw new NotFoundException(`Credential profile '${profileName}' not found`);
        }

        const decryptedJson = this.encryptionService.decrypt({
            content: credential.encryptedData,
            iv: credential.iv,
            tag: credential.authTag,
        });

        return JSON.parse(decryptedJson);
    }
}
