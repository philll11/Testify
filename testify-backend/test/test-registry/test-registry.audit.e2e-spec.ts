import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS, Resource } from '../../src/common/constants/permissions.constants';
import { User } from '../../src/iam/users/entities/user.entity';
import { Role } from '../../src/iam/roles/entities/role.entity';
import { TestRegistry } from '../../src/test-registry/entities/test-registry.entity';
import { AuditEntry, AuditAction } from '../../src/system/audits/entities/audit.entity';
import { SystemConfig } from '../../src/system/config/entities/system-config.entity';

describe('TestRegistry Audit (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;

  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let testRegistryRepository: Repository<TestRegistry>;
  let auditRepository: Repository<AuditEntry>;
  let systemConfigRepository: Repository<SystemConfig>;

  let adminToken: string;
  let adminUser: User;
  let profileId: string;

  jest.setTimeout(60000);

  beforeAll(async () => {
    const setup = await setupTestApp();
    app = setup.app;
    dataSource = setup.dataSource;
    jwtService = setup.jwtService;

    userRepository = dataSource.getRepository(User);
    roleRepository = dataSource.getRepository(Role);
    testRegistryRepository = dataSource.getRepository(TestRegistry);
    auditRepository = dataSource.getRepository(AuditEntry);
    systemConfigRepository = dataSource.getRepository(SystemConfig);

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
        }),
      );
    }

    const adminRole = await roleRepository.save(
      roleRepository.create({
        recordId: 'ADMIN_ROLE_REG_AUDIT',
        name: 'Admin Role Reg Audit',
        permissions: Object.values(PERMISSIONS),
      }),
    );

    adminUser = await userRepository.save(
      userRepository.create({
        recordId: 'ADMIN_REG_AUDIT',
        name: 'Admin User',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin.reg.audit@test.com',
        role: adminRole,
      }),
    );

    adminToken = jwtService.sign({
      sub: adminUser.recordId,
      tokenVersion: 0,
    });

    profileId = '123e4567-e89b-12d3-a456-426614174000';
  });

  afterAll(async () => {
    await teardownTestApp({ app, dataSource });
  });

  beforeEach(async () => {
    await auditRepository.clear();
    await testRegistryRepository.clear();
  });

  it('should log CREATE action when a mapping is created', async () => {
    const dto = {
      profileId: profileId,
      targetComponentId: 'audit-target-1',
      testComponentId: 'audit-test-1',
    };

    const response = await request(app.getHttpServer())
      .post('/test-registry')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(dto)
      .expect(201);

    const createdId = response.body.id;

    // Verify Audit Log
    const logs = await auditRepository.find({
      where: { resource: Resource.TEST_REGISTRY, resourceId: createdId },
    });

    expect(logs.length).toBe(1);
    const log = logs[0];
    expect(log.action).toBe(AuditAction.CREATE);
    expect(log.userId).toBe(adminUser.id);
    expect(log.reason).toBe('Test Registry mapping created');

    // Test registry mappings log changes out on CREATE based on audits data logic
    const changeFields = log.changes.map((c: any) => c.field);
    expect(changeFields).toContain('targetComponentId');
    expect(changeFields).toContain('profileId');
  });

  it('should log DELETE action when a mapping is removed', async () => {
    const mapping = await testRegistryRepository.save(
      testRegistryRepository.create({
        profileId: profileId,
        targetComponentId: 'audit-target-del',
        testComponentId: 'audit-test-del',
      })
    );

    await request(app.getHttpServer())
      .delete(`/test-registry/${mapping.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    const logs = await auditRepository.find({
      where: { resource: Resource.TEST_REGISTRY, resourceId: mapping.id },
    });

    expect(logs.length).toBe(1);
    const log = logs[0];
    expect(log.action).toBe(AuditAction.DELETE);
    expect(log.userId).toBe(adminUser.id);
    expect(log.reason).toBe('Test Registry mapping deleted');
  });
});
