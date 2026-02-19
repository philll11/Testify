
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from './entities/system-config.entity';

@Injectable()
export class SystemConfigService implements OnModuleInit {
  private cache = new Map<string, { value: any; expiry: number }>();
  private readonly TTL = 60 * 1000; // 60 seconds

  constructor(
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepository: Repository<SystemConfig>,
  ) {}

  async onModuleInit() {
    // Optional: Preload critical configs here if needed
  }

  async get(key: string): Promise<SystemConfig | null> {
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && cached.expiry > now) {
      return cached.value as SystemConfig;
    }

    const config = await this.systemConfigRepository.findOneBy({ key, isDeleted: false });
    if (config) {
      this.cache.set(key, { value: config, expiry: now + this.TTL });
      return config;
    }

    return null;
  }

  async set(key: string, value: any, description?: string): Promise<void> {
    let config = await this.systemConfigRepository.findOneBy({ key });

    if (!config) {
      config = this.systemConfigRepository.create({
        key,
        value,
        description,
        isDeleted: false
      });
    } else {
      config.value = value;
      if (description) {
        config.description = description;
      }
      config.isDeleted = false; // Restore if it was logically deleted
    }

    const updatedConfig = await this.systemConfigRepository.save(config);

    // Invalidate cache or update it
    if (updatedConfig) {
      this.cache.set(key, { value: updatedConfig, expiry: Date.now() + this.TTL });
    }
  }

  async getAll(): Promise<SystemConfig[]> {
      return this.systemConfigRepository.find({ where: { isDeleted: false } });
  }
}
