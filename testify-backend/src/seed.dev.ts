import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { SystemConfig } from './system/config/entities/system-config.entity';
import { SystemConfigKeys } from './common/constants/system-config.constants';
import { PlatformProfile } from './integration/platform-profile/entities/platform-profile.entity';
import { PlatformEnvironment } from './integration/platform-environment/entities/platform-environment.entity';
import { IntegrationPlatform } from './integration/constants/integration-platform.enum';
import { EncryptionService } from './common/encryption/encryption.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const configService = app.get(ConfigService);
    const dataSource = app.get(DataSource);

    const systemConfigRepo = dataSource.getRepository(SystemConfig);
    const profileRepo = dataSource.getRepository(PlatformProfile);
    const environmentRepo = dataSource.getRepository(PlatformEnvironment);

    const encryptionService = app.get(EncryptionService);

    try {
        console.log('Starting development data seeding...');

        // --- Platform Profile ---
        const devProfileName = 'Boomi Development Profile';
        let devProfile = await profileRepo.findOne({
            where: { name: devProfileName },
        });

        if (!devProfile) {
            devProfile = await profileRepo.save(
                profileRepo.create({
                    name: devProfileName,
                    description: 'Seeded development profile for Boomi',
                    accountId: configService.get<string>('BOOMI_ACCOUNT_ID') || 'dummy-account-id',
                    platformType: IntegrationPlatform.BOOMI,
                    config: { pollInterval: 5000, maxRetries: 3 },
                }),
            );
            console.log('Verified Seeded Platform Profile.');
        }

        // --- Platform Environment ---
        const devEnvName = 'Boomi Development Environment';
        let devEnv = await environmentRepo.findOne({
            where: { name: devEnvName },
        });

        if (!devEnv && devProfile) {
            const credentials = {
                username: configService.get<string>('BOOMI_USERNAME') || 'dummy-username',
                passwordOrToken: configService.get<string>('BOOMI_PASSWORD') || 'dummy-password',
                executionInstanceId: configService.get<string>('BOOMI_EXECUTION_INSTANCE') || 'dummy-execution-instance-id',
            };
            const encrypted = await encryptionService.encrypt(JSON.stringify(credentials));

            devEnv = await environmentRepo.save(
                environmentRepo.create({
                    name: devEnvName,
                    description: 'Seeded development environment',
                    platformType: IntegrationPlatform.BOOMI,
                    profile: devProfile,
                    isDefault: true,
                    encryptedData: encrypted.content,
                    iv: encrypted.iv,
                    authTag: encrypted.tag,
                }),
            );
            console.log('Verified Seeded Platform Environment.');

            // Update default sync environment ID in system config
            const discConfig = await systemConfigRepo.findOne({
                where: { key: SystemConfigKeys.DISCOVERY.CONFIG },
            });

            if (discConfig && discConfig.value && !discConfig.value.defaultSyncEnvironmentId) {
                discConfig.value.defaultSyncEnvironmentId = devEnv.id;
                discConfig.value.testDirectoryFolderName = '70 - Test Processes';
                await systemConfigRepo.save(discConfig);
                console.log('Updated Discovery Config with Default Environment ID.');
            }
        }

        console.log('Development database seeding process finished.');
    } catch (error) {
        console.error('Seeding failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

bootstrap();