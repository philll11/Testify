// backend/test/user/user.auth.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { Role } from '../../src/iam/roles/entities/role.entity';
import { User } from '../../src/iam/users/entities/user.entity';
import { CreateUserDto } from '../../src/iam/users/dto/create-user.dto';

describe('Users Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;

  // Repositories
  let roleRepository: Repository<Role>;
  let userRepository: Repository<User>;

  // Personas & Tokens
  let viewUserToken: string;
  let editUserToken: string;
  let createUserToken: string;
  let deleteUserToken: string;
  let manageUserInactiveToken: string;
  let noPermissionsToken: string;

  // Test Entities
  let testRole: Role;
  let testUser: User;

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
      // Check if exists
      let role = await roleRepository.findOne({ where: { recordId } });
      if (!role) {
        role = await roleRepository.save(
          roleRepository.create({
            recordId,
            name,
            permissions,
          }),
        );
      }

      let user = await userRepository.findOne({
        where: { recordId: `${userPrefix}_USER` },
      });
      if (!user) {
        user = await userRepository.save(
          userRepository.create({
            recordId: `${userPrefix}_USER`,
            name: `${name} User`,
            firstName: userPrefix,
            lastName: 'User',
            email: `${userPrefix.toLowerCase()}@test.com`,
            role,
          }),
        );
      }
      return jwtService.sign({ sub: user.recordId, tokenVersion: 0 });
    };

    viewUserToken = await createRoleAndUser(
      'ROLE_VIEWER_USER',
      'User Viewer',
      [PERMISSIONS.USER_VIEW],
      'VIEW_USER',
    );
    editUserToken = await createRoleAndUser(
      'ROLE_EDITOR_USER',
      'User Editor',
      [PERMISSIONS.USER_EDIT],
      'EDIT_USER',
    );
    createUserToken = await createRoleAndUser(
      'ROLE_CREATOR_USER',
      'User Creator',
      [PERMISSIONS.USER_CREATE],
      'CREATE_USER',
    );
    deleteUserToken = await createRoleAndUser(
      'ROLE_DELETER_USER',
      'User Deleter',
      [PERMISSIONS.USER_DELETE],
      'DELETE_USER',
    );
    manageUserInactiveToken = await createRoleAndUser(
      'ROLE_INACTIVE_MGR_USER',
      'User Inactive Manager',
      [
        PERMISSIONS.USER_VIEW,
        PERMISSIONS.USER_EDIT,
        PERMISSIONS.USER_MANAGE_INACTIVE,
      ],
      'INACT_USER',
    ); // Needs edit to reach isActive check
    noPermissionsToken = await createRoleAndUser(
      'ROLE_NO_PERMS_USER',
      'No Perms User',
      [],
      'NO_PERMS_USER',
    );
  });

  afterAll(async () => {
    await teardownTestApp({ app, dataSource });
  });

  beforeEach(async () => {
    // Create a standard role for users created during tests
    let role = await roleRepository.findOne({
      where: { recordId: 'TEST_ROLE_USER_AUTH' },
    });
    if (!role) {
      role = await roleRepository.save(
        roleRepository.create({
          recordId: 'TEST_ROLE_USER_AUTH',
          name: 'Test Role User Auth',
          permissions: [PERMISSIONS.USER_VIEW],
        }),
      );
    }
    testRole = role;

    // Create a user for manipulation
    const user = await userRepository.findOne({
      where: { recordId: 'TEST_USER_AUTH' },
    });
    if (user) {
      await userRepository.delete(user.id); // Ensure fresh start
    }

    testUser = await userRepository.save(
      userRepository.create({
        recordId: 'TEST_USER_AUTH',
        name: 'Auth Test User',
        firstName: 'Auth',
        lastName: 'Test',
        email: `auth.test.user.${Date.now()}@test.com`,
        role: testRole,
      }),
    );
  });

  describe('GET /users', () => {
    it('should allow access with USER_VIEW permission', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${viewUserToken}`);

      // It might return 200, check expectations
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should deny access without USER_VIEW permission', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${createUserToken}`) // Has create but likely not view implicitly unless logic says so. Assuming strict.
        .expect(403);
    });
  });

  describe('GET /users/:id', () => {
    it('should allow access with USER_VIEW permission', async () => {
      await request(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${viewUserToken}`)
        .expect(200);
    });

    it('should deny access without USER_VIEW permission', async () => {
      await request(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${noPermissionsToken}`)
        .expect(403);
    });
  });

  describe('POST /users', () => {
    it('should allow creating user with USER_CREATE permission', async () => {
      const newUserDto: CreateUserDto = {
        firstName: 'Created',
        lastName: 'ByAuth',
        email: `auth.create.${Date.now()}@test.com`,
        roleId: testRole.id,
      };

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${createUserToken}`)
        .send(newUserDto)
        .expect(201);
    });

    it('should deny creating user without USER_CREATE permission', async () => {
      const newUserDto: CreateUserDto = {
        firstName: 'Fail',
        lastName: 'Auth',
        email: `auth.fail.${Date.now()}@test.com`,
        roleId: testRole.id,
      };

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${viewUserToken}`)
        .send(newUserDto)
        .expect(403);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should allow updating user with USER_EDIT permission', async () => {
      const updateDto = {
        firstName: 'UpdatedName',
      };

      await request(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${editUserToken}`)
        .send(updateDto)
        .expect(200);
    });

    it('should deny updating user without USER_EDIT permission', async () => {
      const updateDto = {
        firstName: 'FailUpdate',
      };

      await request(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${viewUserToken}`)
        .send(updateDto)
        .expect(403);
    });
  });

  describe('PATCH /users/:id (isActive)', () => {
    it('should allow changing isActive with USER_MANAGE_INACTIVE permission', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${manageUserInactiveToken}`)
        .send({ isActive: false })
        .expect(200);
    });

    it('should deny changing isActive without USER_MANAGE_INACTIVE permission', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${editUserToken}`) // Has EDIT but not MANAGE_INACTIVE
        .send({ isActive: false })
        .expect(403);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should allow deleting user with USER_DELETE permission', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${deleteUserToken}`)
        .expect(200);
    });

    it('should deny deleting user without USER_DELETE permission', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${editUserToken}`)
        .expect(403);
    });
  });
});
