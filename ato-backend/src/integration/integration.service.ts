import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UserCredentialsService } from '../iam/users/user-credentials.service';
import { SystemConfigService } from '../system/config/system-config.service';
import { SystemConfigKeys } from '../common/constants/system-config.constants';
import { IIntegrationPlatformService, PlatformConfig } from './interfaces/integration-platform.interface';
import { BoomiService } from './boomi/boomi.service';
import { IntegrationPlatform } from '../iam/users/entities/user-integration-credential.entity';

@Injectable()
export class IntegrationService {
    private readonly logger = new Logger(IntegrationService.name);

    constructor(
        private readonly userCredentialsService: UserCredentialsService,
        private readonly systemConfigService: SystemConfigService,
    ) { }

    /**
     * Factory method to get a configured platform service instance.
     * @param userId The ID of the user requesting the service.
     * @param profileName The name of the credential profile to use.
     */
    async getService(userId: string, profileName: string): Promise<IIntegrationPlatformService> {
        // 1. Retrieve and Decrypt Credentials
        const decryptedCreds = await this.userCredentialsService.getDecryptedCredential(userId, profileName);

        if (!decryptedCreds) {
            throw new NotFoundException(`Credential profile '${profileName}' not found for user.`);
        }

        const platformName: string = decryptedCreds.platformName || IntegrationPlatform.BOOMI;

        switch (platformName) {
            case IntegrationPlatform.BOOMI:
                // Boomi-specific configuration
                const pollIntervalConfig = await this.systemConfigService.get(SystemConfigKeys.BOOMI.POLL_INTERVAL);
                const maxPollsConfig = await this.systemConfigService.get(SystemConfigKeys.BOOMI.MAX_POLLS);

                const boomiConfig: PlatformConfig = {
                    pollInterval: pollIntervalConfig ? parseInt(pollIntervalConfig.value, 10) : undefined,
                    maxPolls: maxPollsConfig ? parseInt(maxPollsConfig.value, 10) : undefined
                };

                return new BoomiService({
                    accountId: decryptedCreds.accountId,
                    username: decryptedCreds.username,
                    passwordOrToken: decryptedCreds.passwordOrToken,
                    executionInstanceId: decryptedCreds.executionInstanceId
                }, boomiConfig);

            default:
                throw new Error(`Unsupported integration platform: ${platformName}`);
        }
    }
}