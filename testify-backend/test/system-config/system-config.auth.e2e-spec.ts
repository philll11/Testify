// backend/test/system-config/system-config.auth.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { SystemConfig } from '../../src/system/config/entities/system-config.entity';
import { User } from '../../src/iam/users/entities/user.entity';
import { Role } from '../../src/iam/roles/entities/role.entity';

describe('System Config Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;

  // Repositories
  let systemConfigRepository: Repository<SystemConfig>;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;

  // Personas & Tokens
  let adminToken: string;
  let viewOnlyToken: string;
  let noConfigsToken: string;

  const testConfigKey = 'auth_audit_config';

  jest.setTimeout(60000);

  beforeAll(async () => {
    const setup = await setupTestApp();
    app = setup.app;
    dataSource = setup.dataSource;
    jwtService = setup.jwtService;

    systemConfigRepository = dataSource.getRepository(SystemConfig);
    userRepository = dataSource.getRepository(User);
    roleRepository = dataSource.getRepository(Role);

    // Seed Config
    await systemConfigRepository.save({
      key: testConfigKey,
      value: { enabled: true },
      description: 'Audit',
    });

    // Helper to create persona
    const createPersona = async (
      recordId: string,
      roleName: string,
      perms: string[],
      email: string,
    ) => {
      const role = await roleRepository.save(
        roleRepository.create({
          recordId: `ROLE_${recordId}`,
          name: roleName,
          permissions: perms,
        }),
      );
      const user = await userRepository.save(
        userRepository.create({
          recordId: `USER_${recordId}`,
          name: roleName,
          firstName: 'Test',
          lastName: 'User',
          email: email,
          role: role,
        }),
      );
      return jwtService.sign({ sub: user.recordId, tokenVersion: 0 });
    };

    // 1. Admin (Edit & View)
    adminToken = await createPersona(
      'SC_AUTH_ADMIN',
      'Config Admin',
      [PERMISSIONS.SYSTEM_CONFIG_VIEW, PERMISSIONS.SYSTEM_CONFIG_EDIT],
      'sc.auth.admin@test.com',
    );

    // 2. View Only
    viewOnlyToken = await createPersona(
      'SC_AUTH_VIEW',
      'Config Viewer',
      [PERMISSIONS.SYSTEM_CONFIG_VIEW],
      'sc.auth.view@test.com',
    );

    // 3. No Config Perms
    noConfigsToken = await createPersona(
      'SC_AUTH_NONE',
      'No Config Perms',
      [PERMISSIONS.USER_VIEW], // Unrelated permission
      'sc.auth.none@test.com',
    );
  });

  afterAll(async () => {
    await teardownTestApp({ app, dataSource });
  });

  describe('GET /system/config', () => {
    it('should fail with 401 for unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/system/config').expect(401);
    });

    it('should fail with 403 for a user without SYSTEM_CONFIG_VIEW permission', async () => {
      await request(app.getHttpServer())
        .get('/system/config')
        .set('Authorization', `Bearer ${noConfigsToken}`)
        .expect(403);
    });

    it('should succeed for a user with SYSTEM_CONFIG_VIEW permission', async () => {
      await request(app.getHttpServer())
        .get('/system/config')
        .set('Authorization', `Bearer ${viewOnlyToken}`)
        .expect(200);
    });

    it('should succeed for a user with SYSTEM_CONFIG_EDIT permission (implies view access)', async () => {
      await request(app.getHttpServer())
        .get('/system/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('PATCH /system/config/:key', () => {
    const updateDto = { value: { updated: true } };

    it('should fail with 401 for unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .patch(`/system/config/${testConfigKey}`)
        .send(updateDto)
        .expect(401);
    });

    it('should fail with 403 for a user without SYSTEM_CONFIG_EDIT permission', async () => {
      await request(app.getHttpServer())
        .patch(`/system/config/${testConfigKey}`)
        .set('Authorization', `Bearer ${noConfigsToken}`)
        .send(updateDto)
        .expect(403);
    });

    it('should fail with 403 for a user with only SYSTEM_CONFIG_VIEW permission', async () => {
      await request(app.getHttpServer())
        .patch(`/system/config/${testConfigKey}`)
        .set('Authorization', `Bearer ${viewOnlyToken}`)
        .send(updateDto)
        .expect(403);
    });

    it('should succeed for a user with SYSTEM_CONFIG_EDIT permission', async () => {
      await request(app.getHttpServer())
        .patch(`/system/config/${testConfigKey}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200);

      // Verify
      const updated = await systemConfigRepository.findOneBy({
        key: testConfigKey,
      });
      expect(updated?.value).toEqual(updateDto.value);
    });
  });
});
