// backend/test/user/user.audit.e2e-spec.ts
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
import { CreateUserDto } from '../../src/iam/users/dto/create-user.dto';

describe('Users Audit (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;

  // Repositories
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let auditRepository: Repository<AuditEntry>;
  let systemConfigRepository: Repository<SystemConfig>;

  // Personas & Tokens
  let adminToken: string;
  let adminUser: User;
  let adminRole: Role;
  let employeeRole: Role;

  jest.setTimeout(60000);

  beforeAll(async () => {
    const setup = await setupTestApp();
    app = setup.app;
    dataSource = setup.dataSource;
    jwtService = setup.jwtService;

    userRepository = dataSource.getRepository(User);
    roleRepository = dataSource.getRepository(Role);
    auditRepository = dataSource.getRepository(AuditEntry);
    systemConfigRepository = dataSource.getRepository(SystemConfig);

    // 1. Enable Auditing Globally
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
        recordId: 'ADM_AUDIT',
        name: 'Audit Admin',
        permissions: Object.values(PERMISSIONS),
      }),
    );

    employeeRole = await roleRepository.save(
      roleRepository.create({
        recordId: 'EMP_AUDIT',
        name: 'Audit Employee',
        permissions: [],
      }),
    );

    // 3. Setup Admin User (Actor)
    adminUser = await userRepository.save(
      userRepository.create({
        recordId: 'ADM_USR_AUDIT',
        name: 'Audit Admin',
        firstName: 'Audit',
        lastName: 'Admin',
        email: 'audit.admin@test.com',
        role: adminRole,
      }),
    );
    adminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });
  });

  afterAll(async () => {
    await teardownTestApp({ app, dataSource });
  });

  beforeEach(async () => {
    // Clear previous audits for isolation
    await auditRepository.clear();
    // Clear test users created in previous tests (keep Admin)
    const testUser = await userRepository.findOne({
      where: { email: 'audit.test@user.com' },
    });
    if (testUser) await userRepository.remove(testUser);
  });

  it('should log CREATE action when a user is created', async () => {
    const newUserDto: CreateUserDto = {
      firstName: 'Audit',
      lastName: 'Test',
      email: 'audit.test@user.com',
      roleId: employeeRole.id,
    };

    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newUserDto)
      .expect(201);

    const createdUserId = response.body.id;

    // Verify Audit Log
    const logs = await auditRepository.find({
      where: { resource: Resource.USER, resourceId: createdUserId },
      order: { date: 'DESC' }, // Ensure latest if multiple
    });

    expect(logs.length).toBeGreaterThan(0);
    const log = logs[0];

    expect(log.action).toBe(AuditAction.CREATE);
    expect(log.userId).toBe(adminUser.id);
    expect(log.reason).toBe('User Created');
  });

  it('should log UPDATE action when a user is modified', async () => {
    // 1. Create User directly (bypass audit for speed/clarity if desired, but service call is safer)
    const user = await userRepository.save(
      userRepository.create({
        recordId: 'AUDIT_UPD_TARGET',
        name: 'Update Target',
        firstName: 'Update',
        lastName: 'Target',
        email: 'audit.update.target@test.com',
        role: employeeRole,
      }),
    );

    // 2. Perform Update via API
    const updateDto = {
      firstName: 'Modified',
    };

    await request(app.getHttpServer())
      .patch(`/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateDto)
      .expect(200);

    // 3. Verify Audit Log
    // Filter by resourceId and action UPDATE to ignore the CREATE log if triggered above
    const updates = await auditRepository.find({
      where: {
        resource: Resource.USER,
        resourceId: user.id,
        action: AuditAction.UPDATE,
      },
    });

    expect(updates.length).toBe(1);
    const log = updates[0];

    expect(log.userId).toBe(adminUser.id);

    const changeFields = log.changes.map((c: any) => c.field);
    expect(changeFields).toContain('firstName');

    const firstNameChange = log.changes.find(
      (c: any) => c.field === 'firstName',
    );
    expect(firstNameChange).toEqual(
      expect.objectContaining({
        newValue: 'Modified',
      }),
    );
  });

  it('should log DELETE action when a user is removed', async () => {
    // 1. Create User
    const user = await userRepository.save(
      userRepository.create({
        recordId: 'AUDIT_DEL_TARGET',
        name: 'Delete Target',
        firstName: 'Delete',
        lastName: 'Target',
        email: 'audit.delete.target@test.com',
        role: employeeRole,
      }),
    );

    // 2. Perform Delete via API
    await request(app.getHttpServer())
      .delete(`/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // 3. Verify Log
    const logs = await auditRepository.find({
      where: {
        resource: Resource.USER,
        resourceId: user.id,
        action: AuditAction.DELETE,
      },
    });

    expect(logs.length).toBe(1);
    const log = logs[0];

    expect(log.userId).toBe(adminUser.id);
    expect(log.reason).toBe('User Deleted');
  });
});
