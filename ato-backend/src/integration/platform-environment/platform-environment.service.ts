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

  async create(
    createDto: CreatePlatformEnvironmentDto,
  ): Promise<PlatformEnvironment> {
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
      encryptedData: encrypted.content,
      iv: encrypted.iv,
      authTag: encrypted.tag,
    });

    return this.environmentRepository.save(environment);
  }

  async findAll(): Promise<PlatformEnvironment[]> {
    return this.environmentRepository.find({
      relations: ['profile'],
      select: [
        'id',
        'name',
        'description',
        'platformType',
        'createdAt',
        'updatedAt',
      ], // Exclude sensitive details
    });
  }

  async findOne(id: string): Promise<PlatformEnvironment> {
    const environment = await this.environmentRepository.findOne({
      where: { id },
      relations: ['profile'],
    });
    if (!environment) {
      throw new NotFoundException(
        `Platform Environment with ID "${id}" not found.`,
      );
    }

    try {
      if (environment.encryptedData) {
        const decrypted = await this.encryptionService.decrypt({
          content: environment.encryptedData,
          iv: environment.iv,
          tag: environment.authTag,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (environment as any).credentials = JSON.parse(decrypted);

        // Remove sensitive encrypted data from response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (environment as any).encryptedData;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (environment as any).iv;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (environment as any).authTag;
      }
    } catch (error) {
      // Ignore decryption errors for now, just return environment without credentials
    }

    return environment;
  }

  async findByName(name: string): Promise<PlatformEnvironment | null> {
    return this.environmentRepository.findOne({
      where: { name },
      relations: ['profile'],
    });
  }

  async update(
    id: string,
    updateDto: UpdatePlatformEnvironmentDto,
  ): Promise<PlatformEnvironment> {
    const environment = await this.findOne(id);

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
      const encrypted = await this.encryptionService.encrypt(
        JSON.stringify(updateDto.credentials),
      );
      environment.encryptedData = encrypted.content;
      environment.iv = encrypted.iv;
      environment.authTag = encrypted.tag;
    }

    return this.environmentRepository.save(environment);
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
    const environment = await this.findOne(id);

    const decrypted = await this.encryptionService.decrypt({
      content: environment.encryptedData,
      iv: environment.iv,
      tag: environment.authTag,
    });
    return JSON.parse(decrypted);
  }
}
