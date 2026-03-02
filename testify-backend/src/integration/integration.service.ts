import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PlatformEnvironmentService } from './platform-environment/platform-environment.service';
import { IntegrationPlatform } from './constants/integration-platform.enum';
import {
  IIntegrationPlatformService,
  PlatformConfig,
} from './interfaces/integration-platform.interface';
import { BoomiService } from './boomi/boomi.service';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    private readonly environmentService: PlatformEnvironmentService,
  ) { }

  async getServiceById(_userId: string, environmentId: string): Promise<IIntegrationPlatformService> {
    // 1. Find Environment by ID
    const env = await this.environmentService.findEntityById(environmentId);
    if (!env) {
      throw new NotFoundException(`Platform Environment with ID "${environmentId}" not found.`);
    }

    // 2. Decrypt Credentials
    const credentials = await this.environmentService.getDecryptedCredentials(env.id);

    // 3. Get Profile Configuration from loaded relation
    // We assume profile is fully loaded (relations: ['profile'])
    const profile = env.profile;
    if (!profile) {
      throw new Error(`Environment with ID "${environmentId}" has no linked profile.`);
    }

    const config = profile.config || {};
    const platformConfig: PlatformConfig = {
      pollInterval: config.pollInterval ? Number(config.pollInterval) : undefined,
      maxPolls: config.maxPolls ? Number(config.maxPolls) : undefined,
      initialDelay: config.initialDelay ? Number(config.initialDelay) : undefined,
      maxRetries: config.maxRetries ? Number(config.maxRetries) : undefined,
    };

    switch (env.platformType) {
      case IntegrationPlatform.BOOMI:
        return new BoomiService(
          {
            // Use accountId from profile, fallback to credentials for backward compatibility
            accountId: profile.accountId || credentials.accountId,
            username: credentials.username,
            passwordOrToken: credentials.passwordOrToken,
            executionInstanceId: credentials.executionInstanceId,
          },
          platformConfig,
        );

      default:
        throw new Error(`Unsupported integration platform: ${env.platformType}`);
    }
  }

  async testConnection(environmentId: string): Promise<boolean> {
    try {
      const service = await this.getServiceById('system', environmentId);
      return await service.testConnection();
    } catch (error) {
      this.logger.error(`Connection test failed for environment ${environmentId}:`, error);
      throw error;
    }
  }
}

