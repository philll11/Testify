// backend/src/seed.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { Role } from './iam/roles/entities/role.entity';
import { Counter } from './system/counters/entities/counter.entity';
import { User } from './iam/users/entities/user.entity';
import { SystemConfig } from './system/config/entities/system-config.entity';
import { PERMISSIONS } from './common/constants/permissions.constants';
import { SystemConfigKeys } from './common/constants/system-config.constants';
import { PlatformProfile } from './integration/platform-profile/entities/platform-profile.entity';
import { PlatformEnvironment } from './integration/platform-environment/entities/platform-environment.entity';
import { IntegrationPlatform } from './integration/constants/integration-platform.enum';
import { EncryptionService } from './common/encryption/encryption.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(ConfigService);
  const dataSource = app.get(DataSource);

  const roleRepo = dataSource.getRepository(Role);
  const counterRepo = dataSource.getRepository(Counter);
  const userRepo = dataSource.getRepository(User);
  const systemConfigRepo = dataSource.getRepository(SystemConfig);
  const profileRepo = dataSource.getRepository(PlatformProfile);
  const environmentRepo = dataSource.getRepository(PlatformEnvironment);

  const encryptionService = app.get(EncryptionService);
  const isDev = configService.get('NODE_ENV') !== 'production';

  try {
    console.log('Starting database seeding process...');

    // ---------------------------------------------------------
    // 1. ESSENTIAL SYSTEM DATA (Runs in ALL Environments)
    // ---------------------------------------------------------

    // --- System Configs ---
    const seedConfigs = [
      {
        key: SystemConfigKeys.AUDIT.CONFIG,
        value: { enabled: true, retentionDays: 90 },
        description: 'Global Audit Logging Settings',
      },
      {
        key: SystemConfigKeys.DISCOVERY.CONFIG,
        value: {
          componentTypes: ['process', 'webservice', 'processroute'],
          testDirectoryFolderName: null,
          defaultSyncEnvironmentId: null,
          syncScheduleCron: '0 */4 * * *',
          isSyncActive: false,
        },
        description: 'Discovery and Synchronization Engine Settings',
      },
    ];

    for (const config of seedConfigs) {
      const existingConfig = await systemConfigRepo.findOne({
        where: { key: config.key },
      });
      if (!existingConfig) {
        await systemConfigRepo.save(systemConfigRepo.create(config));
      }
    }
    console.log('Verified System Configs.');

    // --- Counters ---
    const seedCounters = [
      { _id: 'user', prefix: 'USR', sequence_value: 1 },
      { _id: 'role', prefix: 'ROL', sequence_value: 0 },
    ];

    for (const counterData of seedCounters) {
      const existingCounter = await counterRepo.findOne({
        where: { _id: counterData._id },
      });
      if (!existingCounter) {
        await counterRepo.save(counterRepo.create(counterData));
      }
    }
    console.log('Verified System Counters.');

    // --- Roles ---
    const seedRoles = [
      {
        recordId: 'ROLE_ADMINISTRATOR',
        name: 'Administrator',
        permissions: Object.values(PERMISSIONS),
        isActive: true,
      },
      {
        recordId: 'ROLE_DEVELOPER',
        name: 'Developer',
        permissions: [PERMISSIONS.USER_VIEW, PERMISSIONS.AUDIT_VIEW],
        isActive: true,
      },
      {
        recordId: 'ROLE_VIEWER',
        name: 'Viewer',
        permissions: [PERMISSIONS.USER_VIEW],
        isActive: true,
      },
    ];

    for (const roleData of seedRoles) {
      const { recordId, permissions, ...rest } = roleData;
      const existingRole = await roleRepo.findOne({ where: { recordId } });
      if (!existingRole) {
        await roleRepo.save(
          roleRepo.create({
            ...rest,
            recordId,
            permissions,
          }),
        );
      } else {
        // Update permissions ensuring new ones are added
        // For seed, maybe just overwrite permissions or merge distinctive sets
        const uniquePermissions = [
          ...new Set([...existingRole.permissions, ...permissions]),
        ];
        existingRole.permissions = uniquePermissions;
        await roleRepo.save(existingRole);
      }
    }
    console.log('Verified System Roles.');

    // --- Admin User ---
    const adminRole = await roleRepo.findOne({
      where: { recordId: 'ROLE_ADMINISTRATOR' },
    });
    const adminEmail = configService.get<string>('ADMIN_EMAIL');

    if (adminEmail && adminRole) {
      const adminPassword = configService.get<string>('ADMIN_PASSWORD') || 'pw';
      const hash = await bcrypt.hash(adminPassword, 10);
      const existingAdmin = await userRepo.findOne({
        where: { email: adminEmail },
      });

      if (!existingAdmin) {
        await userRepo.save(
          userRepo.create({
            recordId: 'USR0001',
            firstName: configService.get('ADMIN_FIRST_NAME') || 'System',
            lastName: configService.get('ADMIN_LAST_NAME') || 'Administrator',
            name: 'System Administrator',
            email: adminEmail,
            password: hash,
            role: adminRole,
            roleId: adminRole.id, // Explicit FK
            isActive: true,
            preferences: { theme: 'auto' }, // Default jsonb
          }),
        );
        console.log('Verified System Admin.');
      }
    }

    // ---------------------------------------------------------
    // 2. DEVELOPMENT DATA (Runs only in non-production)
    // ---------------------------------------------------------
    if (isDev) {
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
    }

    console.log('Database seeding process finished.');
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap();
