// backend/test/counter/counter.auth.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { Counter } from '../../src/system/counters/entities/counter.entity';
import { User } from '../../src/iam/users/entities/user.entity';
import { Role } from '../../src/iam/roles/entities/role.entity';

describe('Counters Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;

  // Repositories
  let counterRepository: Repository<Counter>;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;

  // Personas & Tokens
  let adminToken: string;
  let viewOnlyToken: string;
  let noPermsToken: string;

  // Test Data
  const testCounterId = 'test_auth_counter';

  jest.setTimeout(60000);

  beforeAll(async () => {
    const setup = await setupTestApp();
    app = setup.app;
    dataSource = setup.dataSource;
    jwtService = setup.jwtService;

    counterRepository = dataSource.getRepository(Counter);
    userRepository = dataSource.getRepository(User);
    roleRepository = dataSource.getRepository(Role);

    // Helper
    const createPersona = async (
      roleRecordId: string,
      roleName: string,
      perms: string[],
      userRecordId: string,
      email: string,
    ) => {
      const role = await roleRepository.save(
        roleRepository.create({
          recordId: roleRecordId,
          name: roleName,
          permissions: perms,
        }),
      );
      const user = await userRepository.save(
        userRepository.create({
          recordId: userRecordId,
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
      'ROLE_C_AUTH_ADMIN',
      'Counter Admin',
      [PERMISSIONS.COUNTERS_VIEW, PERMISSIONS.COUNTERS_EDIT],
      'USER_C_AUTH_ADMIN',
      'counter.auth.admin@test.com',
    );

    // 2. View Only
    viewOnlyToken = await createPersona(
      'ROLE_C_AUTH_VIEW',
      'Counter Viewer',
      [PERMISSIONS.COUNTERS_VIEW],
      'USER_C_AUTH_VIEW',
      'counter.auth.view@test.com',
    );

    // 3. No Perms
    noPermsToken = await createPersona(
      'ROLE_C_AUTH_NONE',
      'No Counter Perms',
      [], // No permissions related to counters
      'USER_C_AUTH_NONE',
      'counter.auth.none@test.com',
    );

    // Seed Counter
    await counterRepository.save({
      _id: testCounterId,
      prefix: 'AUTH',
      sequence_value: 0,
    });
  });

  afterAll(async () => {
    await teardownTestApp({ app, dataSource });
  });

  describe('GET /counters', () => {
    it('should fail with 401 for unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/counters').expect(401);
    });

    it('should fail with 403 for user without COUNTERS_VIEW permission', async () => {
      await request(app.getHttpServer())
        .get('/counters')
        .set('Authorization', `Bearer ${noPermsToken}`)
        .expect(403);
    });

    it('should succeed for user with COUNTERS_VIEW permission', async () => {
      await request(app.getHttpServer())
        .get('/counters')
        .set('Authorization', `Bearer ${viewOnlyToken}`)
        .expect(200);
    });

    it('should succeed for user with COUNTERS_EDIT permission (usually implies View or admin has both)', async () => {
      // Admin has both
      await request(app.getHttpServer())
        .get('/counters')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('PATCH /counters/:id', () => {
    const updateDto = { prefix: 'NEW_PREFIX' };

    it('should fail with 401 for unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .patch(`/counters/${testCounterId}`)
        .send(updateDto)
        .expect(401);
    });

    it('should fail with 403 for user without COUNTERS_EDIT permission', async () => {
      await request(app.getHttpServer())
        .patch(`/counters/${testCounterId}`)
        .set('Authorization', `Bearer ${noPermsToken}`)
        .send(updateDto)
        .expect(403);
    });

    it('should fail with 403 for user with only COUNTERS_VIEW permission', async () => {
      await request(app.getHttpServer())
        .patch(`/counters/${testCounterId}`)
        .set('Authorization', `Bearer ${viewOnlyToken}`)
        .send(updateDto)
        .expect(403);
    });

    it('should succeed for user with COUNTERS_EDIT permission', async () => {
      await request(app.getHttpServer())
        .patch(`/counters/${testCounterId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200);

      // Verify change
      const updated = await counterRepository.findOneBy({ _id: testCounterId });
      expect(updated?.prefix).toBe('NEW_PREFIX');
    });
  });
});
