// backend/test/audit/audit.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import {
  PERMISSIONS,
  Resource,
} from '../../src/common/constants/permissions.constants';
import { User } from '../../src/iam/users/entities/user.entity';
import { Role } from '../../src/iam/roles/entities/role.entity';
import {
  AuditEntry,
  AuditAction,
} from '../../src/system/audits/entities/audit.entity';
import { SystemConfig } from '../../src/system/config/entities/system-config.entity';
import { AuditsService } from '../../src/system/audits/audits.service';

describe('Audits Resource (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let auditsService: AuditsService;

  // Repositories
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let auditRepository: Repository<AuditEntry>;
  let systemConfigRepository: Repository<SystemConfig>;

  // Personas & Tokens
  let adminToken: string;
  let adminUser: User;
  let adminRole: Role;

  let noPermToken: string;
  let noPermUser: User;
  let noPermRole: Role;

  // Test Data
  let targetUser: User;
  let targetRole: Role;

  jest.setTimeout(60000);

  beforeAll(async () => {
    const setup = await setupTestApp();
    app = setup.app;
    dataSource = setup.dataSource;
    jwtService = setup.jwtService;
    auditsService = app.get<AuditsService>(AuditsService);

    userRepository = dataSource.getRepository(User);
    roleRepository = dataSource.getRepository(Role);
    auditRepository = dataSource.getRepository(AuditEntry);
    systemConfigRepository = dataSource.getRepository(SystemConfig);

    // 1. Enable Auditing
    const existingConfig = await systemConfigRepository.findOne({
      where: { key: 'audit' },
    });
    if (existingConfig) {
      existingConfig.value = { enabled: true };
      await systemConfigRepository.save(existingConfig);
    } else {
      await systemConfigRepository.save(
        systemConfigRepository.create({
          key: 'audit',
          value: { enabled: true },
          description: 'Enable Auditing for E2E Tests',
        }),
      );
    }

    // 2. Setup Roles
    adminRole = await roleRepository.save(
      roleRepository.create({
        recordId: 'ADM_AUDIT_VIEW',
        name: 'Audit Viewer',
        permissions: [PERMISSIONS.AUDIT_VIEW],
      }),
    );

    noPermRole = await roleRepository.save(
      roleRepository.create({
        recordId: 'NO_PERM_AUDIT',
        name: 'No Audit View',
        permissions: [],
      }),
    );

    targetRole = await roleRepository.save(
      roleRepository.create({
        recordId: 'TARGET_ROLE',
        name: 'Target Role',
        permissions: [],
      }),
    );

    // 3. Setup Users
    adminUser = await userRepository.save(
      userRepository.create({
        recordId: 'ADM_USR_VIEW',
        name: 'Audit Admin',
        firstName: 'Audit',
        lastName: 'Admin',
        email: 'audit.viewer@test.com',
        role: adminRole,
      }),
    );
    adminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });

    noPermUser = await userRepository.save(
      userRepository.create({
        recordId: 'NO_PERM_USR',
        name: 'No Perm User',
        firstName: 'No',
        lastName: 'Perm',
        email: 'no.perm@test.com',
        role: noPermRole,
      }),
    );
    noPermToken = jwtService.sign({
      sub: noPermUser.recordId,
      tokenVersion: 0,
    });

    // 4. Setup Target Resource
    targetUser = await userRepository.save(
      userRepository.create({
        recordId: 'TARGET_USR',
        name: 'Target User',
        firstName: 'Target',
        lastName: 'User',
        email: 'target.user@test.com',
        role: targetRole,
      }),
    );
  });

  afterAll(async () => {
    await teardownTestApp({ app, dataSource });
  });

  beforeEach(async () => {
    // Clear Audit Logs before each test or just specific ones?
    // Let's seed fresh logs for each test
    await auditRepository.clear();

    await auditsService.log(
      Resource.USER,
      targetUser.id,
      AuditAction.UPDATE,
      { name: 'Old Name' },
      { name: 'New Name' },
      adminUser.id,
      'Test Manual Log',
    );
  });

  describe('GET /system/audit/:resource/:id', () => {
    it('should return 200 and logs for user with AUDIT_VIEW permission', async () => {
      const response = await request(app.getHttpServer())
        // Use the target resource ID we seeded logs for
        .get(`/system/audit/${Resource.USER}/${targetUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      const log = response.body[0];

      expect(log.resourceId).toBe(targetUser.id);
      expect(log.action).toBe(AuditAction.UPDATE);
      // Check if user info is populated (if service does it)
      // Based on my read of AuditsService, it attaches `user` property manually if possible
    });

    it('should return 403 for user WITHOUT AUDIT_VIEW permission', async () => {
      await request(app.getHttpServer())
        .get(`/system/audit/${Resource.USER}/${targetUser.id}`)
        .set('Authorization', `Bearer ${noPermToken}`)
        .expect(403);
    });

    it('should return 404 if resource does not exist (validateResourceAccess check)', async () => {
      // Random valid UUID (v4)
      const randomId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app.getHttpServer())
        .get(`/system/audit/${Resource.USER}/${randomId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get(`/system/audit/${Resource.USER}/invalid-uuid`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400); // ParseUUIDPipe throws 400
    });
  });
});
