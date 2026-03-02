import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformEnvironment } from './entities/platform-environment.entity';
import { CreatePlatformEnvironmentDto } from './dto/create-platform-environment.dto';
import { UpdatePlatformEnvironmentDto } from './dto/update-platform-environment.dto';
import { PlatformEnvironmentResponseDto } from './dto/platform-environment-response.dto';
import { PlatformProfileService } from '../platform-profile/platform-profile.service';
import { EncryptionService } from '../../common/encryption/encryption.service';

@Injectable()
export class PlatformEnvironmentService {
  constructor(
    @InjectRepository(PlatformEnvironment)
    private readonly environmentRepository: Repository<PlatformEnvironment>,
    private readonly platformProfileService: PlatformProfileService,
    private readonly encryptionService: EncryptionService, // Inject EncryptionService
  ) { }

  async create(createDto: CreatePlatformEnvironmentDto): Promise<PlatformEnvironment> {
    // 1. Verify Profile Exists
    const profile = await this.platformProfileService.findOne(
      createDto.profileId,
    );
    if (!profile) {
      throw new NotFoundException(
        `Platform Profile with ID "${createDto.profileId}" not found.`,
      );
    }

    // 2. Check for duplicate name
    const existing = await this.environmentRepository.findOne({
      where: { name: createDto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Environment name "${createDto.name}" already exists.`,
      );
    }

    // 3. Encrypt Credentials
    // The DTO receives a credentials object. We stringify and encrypt it.
    const encrypted = await this.encryptionService.encrypt(
      JSON.stringify(createDto.credentials),
    );

    // 4. Create Entity
    const environment = this.environmentRepository.create({
      name: createDto.name,
      description: createDto.description,
      platformType: profile.platformType, // Inherit from profile
      profile: profile,
      isDefault: createDto.isDefault || false,
      encryptedData: encrypted.content,
      iv: encrypted.iv,
      authTag: encrypted.tag,
    });

    const savedEnvironment = await this.environmentRepository.save(environment);

    // 5. Handle isDefault
    if (createDto.isDefault) {
      await this.setDefaultEnvironment(savedEnvironment.id);
    }

    return savedEnvironment;
  }

  async findAll(): Promise<PlatformEnvironmentResponseDto[]> {
    const environments = await this.environmentRepository.find({
      relations: ['profile'],
      // We don't need to manually select fields here if we rely on the DTO transformation,
      // but keeping it is an optimization to avoid fetching the large encrypted blobs.
      select: [
        'id',
        'name',
        'description',
        'platformType',
        'profileId', // Make sure to select profileId for the DTO
        'isDefault',
        'createdAt',
        'updatedAt',
      ],
    });

    // Map to DTOs. Note: Credentials are NOT included in the list view for security and performance.
    return environments.map((env) =>
      PlatformEnvironmentResponseDto.fromEntity(env, undefined),
    );
  }

  async findOne(id: string): Promise<PlatformEnvironmentResponseDto> {
    const environment = await this.findEntityById(id);

    let credentials: Record<string, any> = {};

    try {
      if (environment.encryptedData) {
        const decrypted = await this.encryptionService.decrypt({
          content: environment.encryptedData,
          iv: environment.iv,
          tag: environment.authTag,
        });
        credentials = JSON.parse(decrypted);
        // Clear sensitive fields before returning to client
        if (credentials.passwordOrToken) {
          credentials.passwordOrToken = '';
        }
      }
    } catch (error) {
      // In production, log this error securely
      console.error(`Failed to decrypt credentials for env ${id}`, error);
    }

    return PlatformEnvironmentResponseDto.fromEntity(environment, credentials);
  }

  public async findEntityById(id: string): Promise<PlatformEnvironment> {
    const environment = await this.environmentRepository.findOne({
      where: { id },
      relations: ['profile'],
    });

    if (!environment) {
      throw new NotFoundException(
        `Platform Environment with ID "${id}" not found.`,
      );
    }

    return environment;
  }

  async findByName(name: string): Promise<PlatformEnvironment | null> {
    return this.environmentRepository.findOne({
      where: { name },
      relations: ['profile'],
    });
  }

  async update(id: string, updateDto: UpdatePlatformEnvironmentDto): Promise<PlatformEnvironment> {
    const environment = await this.findEntityById(id);

    if (updateDto.name && updateDto.name !== environment.name) {
      const existing = await this.environmentRepository.findOne({
        where: { name: updateDto.name },
      });
      if (existing) {
        throw new ConflictException(
          `Environment name "${updateDto.name}" already exists.`,
        );
      }
      environment.name = updateDto.name;
    }

    if (updateDto.description !== undefined) {
      environment.description = updateDto.description;
    }

    if (updateDto.profileId && updateDto.profileId !== environment.profile.id) {
      const profile = await this.platformProfileService.findOne(
        updateDto.profileId,
      );
      if (!profile) {
        throw new NotFoundException(
          `Platform Profile with ID "${updateDto.profileId}" not found.`,
        );
      }
      environment.profile = profile;
      environment.platformType = profile.platformType; // Update platform type
    }

    if (updateDto.credentials) {
      // Logic for secure partial update:
      // If passwordOrToken is empty, it means the user did not provide a new one.
      // We must retain the existing password.
      if (!updateDto.credentials.passwordOrToken) {
        try {
          // Decrypt existing to get the current password
          const decrypted = await this.encryptionService.decrypt({
            content: environment.encryptedData,
            iv: environment.iv,
            tag: environment.authTag,
          });
          const currentCreds = JSON.parse(decrypted);
          // Overwrite the empty incoming field with the actual existing password
          updateDto.credentials.passwordOrToken = currentCreds.passwordOrToken;
        } catch (error) {
          console.error(`Failed to decrypt credentials for env ${id}`, error);
          throw new ConflictException(
            'Failed to verify existing credentials. Please re-enter the password.',
          );
        }
      }

      const encrypted = await this.encryptionService.encrypt(
        JSON.stringify(updateDto.credentials),
      );
      environment.encryptedData = encrypted.content;
      environment.iv = encrypted.iv;
      environment.authTag = encrypted.tag;
    }

    if (updateDto.isDefault !== undefined) {
      environment.isDefault = updateDto.isDefault;
    }

    const savedEnvironment = await this.environmentRepository.save(environment);

    if (updateDto.isDefault) {
      await this.setDefaultEnvironment(savedEnvironment.id);
    }

    return savedEnvironment;
  }

  async remove(id: string): Promise<void> {
    const result = await this.environmentRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Platform Environment with ID "${id}" not found.`,
      );
    }
  }

  // Helper for internal use (e.g. by IntegrationService)
  async getDecryptedCredentials(id: string): Promise<any> {
    const environment = await this.findEntityById(id);

    const decrypted = await this.encryptionService.decrypt({
      content: environment.encryptedData,
      iv: environment.iv,
      tag: environment.authTag,
    });
    return JSON.parse(decrypted);
  }

  async setDefaultEnvironment(id: string | null): Promise<void> {
    // First, clear the default flag from all environments
    await this.environmentRepository.update(
      { isDefault: true },
      { isDefault: false },
    );

    // If an ID is provided, set it as the new default
    if (id) {
      await this.environmentRepository.update({ id }, { isDefault: true });
    }
  }
}
