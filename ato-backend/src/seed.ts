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

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(ConfigService);
  const dataSource = app.get(DataSource);

  const roleRepo = dataSource.getRepository(Role);
  const counterRepo = dataSource.getRepository(Counter);
  const userRepo = dataSource.getRepository(User);
  const systemConfigRepo = dataSource.getRepository(SystemConfig);

  try {
    console.log('Starting database seeding process...');

    // ---------------------------------------------------------
    // 1. ESSENTIAL SYSTEM DATA (Runs in ALL Environments)
    // ---------------------------------------------------------

    // --- System Configs ---
    const seedConfigs = [
      {
        key: 'audit',
        value: { enabled: true, retentionDays: 90 },
        description: 'Global Audit Logging Settings',
      },
    ];

    for (const config of seedConfigs) {
      const existingConfig = await systemConfigRepo.findOne({ where: { key: config.key } });
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
      const existingCounter = await counterRepo.findOne({ where: { _id: counterData._id } });
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
        permissions: [
          PERMISSIONS.USER_VIEW,
          PERMISSIONS.AUDIT_VIEW,
        ],
        isActive: true,
      },
      {
        recordId: 'ROLE_VIEWER',
        name: 'Viewer',
        permissions: [
          PERMISSIONS.USER_VIEW,
        ],
        isActive: true,
      },
    ];

    for (const roleData of seedRoles) {
      const { recordId, permissions, ...rest } = roleData;
      const existingRole = await roleRepo.findOne({ where: { recordId } });
      if (!existingRole) {
        await roleRepo.save(roleRepo.create({
          ...rest,
          recordId,
          permissions
        }));
      } else {
        // Update permissions ensuring new ones are added
        // For seed, maybe just overwrite permissions or merge distinctive sets
        const uniquePermissions = [...new Set([...existingRole.permissions, ...permissions])];
        existingRole.permissions = uniquePermissions;
        await roleRepo.save(existingRole);
      }
    }
    console.log('Verified System Roles.');


    // --- Admin User ---
    const adminRole = await roleRepo.findOne({ where: { recordId: 'ROLE_ADMINISTRATOR' } });
    const adminEmail = configService.get<string>('ADMIN_EMAIL');

    if (adminEmail && adminRole) {
      const hash = await bcrypt.hash('pw', 10);
      const existingAdmin = await userRepo.findOne({ where: { email: adminEmail } });

      if (!existingAdmin) {
        await userRepo.save(userRepo.create({
          recordId: 'USR0001',
          firstName: configService.get('ADMIN_FIRST_NAME') || 'System',
          lastName: configService.get('ADMIN_LAST_NAME') || 'Administrator',
          name: 'System Administrator',
          email: adminEmail,
          password: hash,
          role: adminRole,
          roleId: adminRole.id, // Explicit FK
          isActive: true,
          preferences: { theme: 'auto' } // Default jsonb
        }));
        console.log('Verified System Admin.');
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