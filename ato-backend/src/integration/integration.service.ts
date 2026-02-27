import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PlatformEnvironmentService } from './platform-environment/platform-environment.service';
import { PlatformProfileService } from './platform-profile/platform-profile.service';
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
    private readonly profileService: PlatformProfileService,
  ) {}

  async getService(
    _userId: string,
    environmentName: string,
  ): Promise<IIntegrationPlatformService> {
    // 1. Find Environment by Name
    const env = await this.environmentService.findByName(environmentName);
    if (!env) {
      throw new NotFoundException(
        `Platform Environment "${environmentName}" not found.`,
      );
    }

    // 2. Decrypt Credentials
    const credentials = await this.environmentService.getDecryptedCredentials(
      env.id,
    );

    // 3. Get Profile Configuration from loaded relation
    // We assume profile is fully loaded (relations: ['profile'])
    const profile = env.profile;
    if (!profile) {
      throw new Error(
        `Environment "${environmentName}" has no linked profile.`,
      );
    }

    const config = profile.config || {};
    const platformConfig: PlatformConfig = {
      pollInterval: config.pollInterval
        ? Number(config.pollInterval)
        : undefined,
      maxPolls: config.maxPolls ? Number(config.maxPolls) : undefined,
      initialDelay: config.initialDelay
        ? Number(config.initialDelay)
        : undefined,
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
        throw new Error(
          `Unsupported integration platform: ${env.platformType}`,
        );
    }
  }
}
