// backend/test/role/role.auth.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { Role } from '../../src/iam/roles/entities/role.entity';
import { User } from '../../src/iam/users/entities/user.entity';

describe('Roles Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;

  // Repositories
  let roleRepository: Repository<Role>;
  let userRepository: Repository<User>;

  // Personas & Tokens
  let noPermissionsToken: string;
  let viewRoleToken: string;
  let editRoleToken: string;
  let createRoleToken: string;
  let deleteRoleToken: string;
  let manageInactiveToken: string;

  // Test Entities
  let testRole: Role;
  let inactiveRole: Role;

  jest.setTimeout(60000);

  beforeAll(async () => {
    const setup = await setupTestApp();
    app = setup.app;
    dataSource = setup.dataSource;
    jwtService = setup.jwtService;

    roleRepository = dataSource.getRepository(Role);
    userRepository = dataSource.getRepository(User);

    // Helper to create role and user
    const createRoleAndUser = async (
      recordId: string,
      name: string,
      permissions: string[],
      userPrefix: string,
    ) => {
      const role = await roleRepository.save(
        roleRepository.create({
          recordId,
          name,
          permissions,
        }),
      );
      const user = await userRepository.save(
        userRepository.create({
          recordId: `${userPrefix}_USER`,
          name: `${name} User`,
          firstName: userPrefix,
          lastName: 'User',
          email: `${userPrefix.toLowerCase()}@test.com`,
          role,
        }),
      );
      return jwtService.sign({ sub: user.recordId, tokenVersion: 0 });
    };

    viewRoleToken = await createRoleAndUser(
      'ROLE_VIEWER',
      'Role Viewer',
      [PERMISSIONS.ROLE_VIEW],
      'VIEW',
    );
    editRoleToken = await createRoleAndUser(
      'ROLE_EDITOR',
      'Role Editor',
      [PERMISSIONS.ROLE_EDIT],
      'EDIT',
    );
    createRoleToken = await createRoleAndUser(
      'ROLE_CREATOR',
      'Role Creator',
      [PERMISSIONS.ROLE_CREATE],
      'CREATE',
    );
    deleteRoleToken = await createRoleAndUser(
      'ROLE_DELETER',
      'Role Deleter',
      [PERMISSIONS.ROLE_DELETE],
      'DELETE',
    );
    noPermissionsToken = await createRoleAndUser(
      'ROLE_NO_PERMISSIONS',
      'No Permissions',
      [],
      'NOPERMS',
    );
    manageInactiveToken = await createRoleAndUser(
      'ROLE_INACTIVE_MANAGER',
      'Inactive Manager',
      [
        PERMISSIONS.ROLE_VIEW,
        PERMISSIONS.ROLE_EDIT,
        PERMISSIONS.ROLE_MANAGE_INACTIVE,
      ],
      'INACTIVE',
    );
  });

  afterAll(async () => {
    await teardownTestApp({ app, dataSource });
  });

  beforeEach(async () => {
    // Create a fresh set of roles for each test
    const r1 = roleRepository.create({
      recordId: 'TEST_ROLE_AUTH',
      name: 'Auth Test Role',
      permissions: [PERMISSIONS.USER_VIEW],
    });
    testRole = await roleRepository.save(r1);

    const r2 = roleRepository.create({
      recordId: 'INACTIVE_TEST_ROLE_AUTH',
      name: 'Inactive Auth Test Role',
      permissions: [PERMISSIONS.USER_VIEW],
      isActive: false,
    });
    inactiveRole = await roleRepository.save(r2);
  });

  afterEach(async () => {
    if (testRole) await roleRepository.delete(testRole.id);
    if (inactiveRole) await roleRepository.delete(inactiveRole.id);
  });

  describe('GET /roles', () => {
    it('should allow user with ROLE_VIEW permission', () => {
      return request(app.getHttpServer())
        .get('/roles')
        .set('Authorization', `Bearer ${viewRoleToken}`)
        .expect(200);
    });

    it('should deny user without ROLE_VIEW permission', () => {
      return request(app.getHttpServer())
        .get('/roles')
        .set('Authorization', `Bearer ${noPermissionsToken}`)
        .expect(403);
    });
  });

  describe('POST /roles', () => {
    it('should allow user with ROLE_CREATE permission', async () => {
      await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${createRoleToken}`)
        .send({
          name: 'New Auth Role',
          permissions: [PERMISSIONS.USER_VIEW],
        })
        .expect(201);
    });

    it('should deny user without ROLE_CREATE permission', async () => {
      await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${viewRoleToken}`) // Viewer cannot create
        .send({
          name: 'New Auth Role 2',
          permissions: [PERMISSIONS.USER_VIEW],
        })
        .expect(403);
    });
  });

  describe('PATCH /roles/:id', () => {
    it('should allow user with ROLE_EDIT permission', async () => {
      await request(app.getHttpServer())
        .patch(`/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${editRoleToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);
    });

    it('should deny user without ROLE_EDIT permission', async () => {
      await request(app.getHttpServer())
        .patch(`/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${viewRoleToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);
    });
  });

  describe('DELETE /roles/:id', () => {
    it('should allow user with ROLE_DELETE permission', async () => {
      await request(app.getHttpServer())
        .delete(`/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${deleteRoleToken}`)
        .expect(200);
    });

    it('should deny user without ROLE_DELETE permission', async () => {
      await request(app.getHttpServer())
        .delete(`/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${viewRoleToken}`)
        .expect(403);
    });
  });
});
