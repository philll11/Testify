import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformProfile } from './entities/platform-profile.entity';
import { CreatePlatformProfileDto } from './dto/create-platform-profile.dto';
import { UpdatePlatformProfileDto } from './dto/update-platform-profile.dto';
import { IntegrationPlatform } from '../constants/integration-platform.enum';

@Injectable()
export class PlatformProfileService {
  constructor(
    @InjectRepository(PlatformProfile)
    private platformProfileRepository: Repository<PlatformProfile>,
  ) { }

  async create(
    createPlatformProfileDto: CreatePlatformProfileDto,
  ): Promise<PlatformProfile> {
    const profile = this.platformProfileRepository.create(
      createPlatformProfileDto,
    );
    return this.platformProfileRepository.save(profile);
  }

  async findAll(): Promise<PlatformProfile[]> {
    return this.platformProfileRepository.find();
  }

  async findOne(id: string): Promise<PlatformProfile> {
    const profile = await this.platformProfileRepository.findOne({
      where: { id },
    });
    if (!profile) {
      throw new NotFoundException(`Platform profile with ID "${id}" not found`);
    }
    return profile;
  }

  async update(
    id: string,
    updatePlatformProfileDto: UpdatePlatformProfileDto,
  ): Promise<PlatformProfile> {
    const profile = await this.findOne(id);

    // Merge config if provided
    if (updatePlatformProfileDto.config) {
      Object.assign(profile.config, updatePlatformProfileDto.config);
      delete updatePlatformProfileDto.config; // Remove to avoid overwrite in Object.assign below if logic differs
    }

    Object.assign(profile, updatePlatformProfileDto);
    return this.platformProfileRepository.save(profile);
  }

  async remove(id: string): Promise<void> {
    const result = await this.platformProfileRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Platform profile with ID "${id}" not found`);
    }
  }
}
