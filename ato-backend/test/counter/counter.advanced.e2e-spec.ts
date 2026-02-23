// backend/test/counter/counter.advanced.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { Counter } from '../../src/system/counters/entities/counter.entity';
import { User } from '../../src/iam/users/entities/user.entity';
import { Role } from '../../src/iam/roles/entities/role.entity';

describe('Counters Advanced (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;

  // Repositories
  let counterRepository: Repository<Counter>;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;

  // Personas & Tokens
  let adminToken: string;
  let adminUser: User;
  let adminRole: Role;

  jest.setTimeout(60000);

  // Initial sequence to avoid conflicts with other tests if DB persists (depending on test setup)
  const initialSequence = 1000;

  beforeAll(async () => {
    const setup = await setupTestApp();
    app = setup.app;
    dataSource = setup.dataSource;
    jwtService = setup.jwtService;

    counterRepository = dataSource.getRepository(Counter);
    userRepository = dataSource.getRepository(User);
    roleRepository = dataSource.getRepository(Role);

    // Seed Role Counter (used by RolesService.create)
    // 'role' is the ID hardcoded in RolesService
    await counterRepository.save({
      _id: 'role',
      prefix: 'ROL',
      sequence_value: initialSequence,
    });

    // Create Admin Role
    adminRole = await roleRepository.save(
      roleRepository.create({
        recordId: 'COUNTER_ADV_ADMIN',
        name: 'Counter Advanced Admin',
        permissions: [
          PERMISSIONS.COUNTERS_VIEW,
          PERMISSIONS.COUNTERS_EDIT,
          PERMISSIONS.ROLE_CREATE,
          PERMISSIONS.ROLE_VIEW,
        ],
      }),
    );

    // Create Admin User
    adminUser = await userRepository.save(
      userRepository.create({
        recordId: 'COUNTER_ADV_USER',
        name: 'Counter Advanced Admin',
        firstName: 'Counter',
        lastName: 'Admin',
        email: 'counter.adv.admin@test.com',
        role: adminRole,
      }),
    );

    adminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });
  });

  afterAll(async () => {
    await teardownTestApp({ app, dataSource });
  });

  describe('Counter and Resource Interaction', () => {
    it('should use the new prefix for a newly created resource after a counter update', async () => {
      // 1. Update the prefix for the 'role' counter
      const updateDto = { prefix: 'NEW_ROL' };
      await request(app.getHttpServer())
        .patch('/counters/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200);

      // 2. Create a new Role
      const createRoleDto = {
        name: 'New Prefix Role',
        description: 'Testing counter prefix update',
        permissions: [],
      };

      const res = await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createRoleDto)
        .expect(201);

      // 3. Assert that the new role uses the new prefix
      // recordId format: PREFIXZZZZ where ZZZZ is padded sequence
      const newRecordId = res.body.recordId;
      expect(newRecordId).toMatch(/^NEW_ROL\d{4}$/);

      // Verify sequence incremented
      const sequenceStr = newRecordId.replace('NEW_ROL', '');
      const sequenceNum = parseInt(sequenceStr, 10);
      expect(sequenceNum).toBeGreaterThan(initialSequence);
    });

    it('should preserve the recordId of an existing resource when its counter prefix is updated', async () => {
      // 1. Create a baseline role with current prefix (NEW_ROL from previous test)
      const role1 = await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Baseline Role' })
        .expect(201);

      const originalRecordId = role1.body.recordId;

      // 2. Update the counter prefix again
      const updateDto = { prefix: 'LATEST' };
      await request(app.getHttpServer())
        .patch('/counters/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200);

      // 3. Create another role to confirm prefix switched
      const role2 = await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Latest Role' })
        .expect(201);
      expect(role2.body.recordId).toMatch(/^LATEST\d{4}$/);

      // 4. Fetch the original role again
      const res = await request(app.getHttpServer())
        .get(`/roles/${role1.body.id}`) // Assuming ID creates UUID route
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 5. Assert that its recordId has NOT changed
      expect(res.body.recordId).toBe(originalRecordId);
      expect(res.body.recordId).toMatch(/^NEW_ROL/);
    });

    it('should atomically increment the counter during concurrent resource creation', async () => {
      // 1. Get current sequence value
      const counter = await counterRepository.findOneBy({ _id: 'role' });
      const startSeq = counter?.sequence_value || 0;

      // 2. Fire off 5 concurrent requests to create roles
      // Use unique names to avoid any potential (though unlikely) unique constraint if name was unique
      const createPromises = Array.from({ length: 5 }).map((_, i) =>
        request(app.getHttpServer())
          .post('/roles')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: `Concurrent Role ${i}` }),
      );

      const responses = await Promise.all(createPromises);

      // Check for failures first
      responses.forEach((res) => {
        if (res.status !== 201) {
          console.error('Concurrent creation failed:', res.body);
        }
        expect(res.status).toBe(201);
      });

      // 3. Verify all created roles have unique recordIds
      const recordIds = responses.map((res) => res.body.recordId);
      const uniqueRecordIds = new Set(recordIds);

      expect(uniqueRecordIds.size).toBe(5);

      // 4. Verify sequence incremented by exactly 5
      const finalCounter = await counterRepository.findOneBy({ _id: 'role' });
      expect(finalCounter?.sequence_value).toBe(startSeq + 5);
    });
  });
});
