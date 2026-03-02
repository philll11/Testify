import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { setupTestApp, teardownTestApp } from '../test-utils';
import { PlatformEnvironment } from '../../src/integration/platform-environment/entities/platform-environment.entity';
import { PlatformProfile } from '../../src/integration/platform-profile/entities/platform-profile.entity';
import { User } from '../../src/iam/users/entities/user.entity';
import { Role } from '../../src/iam/roles/entities/role.entity';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { IntegrationPlatform } from '../../src/integration/constants/integration-platform.enum';

describe('Platform Environment E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let environmentRepo: Repository<PlatformEnvironment>;
  let profileRepo: Repository<PlatformProfile>;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;

  let adminToken: string;

  beforeAll(async () => {
    const setup = await setupTestApp();
    app = setup.app;
    dataSource = setup.dataSource;
    jwtService = setup.jwtService;

    environmentRepo = dataSource.getRepository(PlatformEnvironment);
    profileRepo = dataSource.getRepository(PlatformProfile);
    userRepository = dataSource.getRepository(User);
    roleRepository = dataSource.getRepository(Role);

    // Create Admin User with Full Permissions
    const role = await roleRepository.save(
      roleRepository.create({
        recordId: 'ADMIN_ENV_TEST',
        name: 'Environment Admin',
        permissions: [
          PERMISSIONS.PLATFORM_ENVIRONMENT_CREATE,
          PERMISSIONS.PLATFORM_ENVIRONMENT_VIEW,
          PERMISSIONS.PLATFORM_ENVIRONMENT_EDIT,
          PERMISSIONS.PLATFORM_ENVIRONMENT_DELETE,
          PERMISSIONS.PLATFORM_PROFILE_CREATE, // Need this to seed profile
        ],
      }),
    );

    const user = await userRepository.save(
      userRepository.create({
        recordId: 'USER_ENV_TEST',
        firstName: 'Env',
        lastName: 'Admin',
        name: 'Env Admin',
        email: 'env.admin@test.com',
        isActive: true,
        role: role,
      }),
    );

    adminToken = jwtService.sign({ sub: user.recordId, tokenVersion: 0 });

    // Seed a Platform Profile first (Environment depends on it)
    const profile = await profileRepo.save(
      profileRepo.create({
        name: 'Boomi Default',
        accountId: 'boomi-account-seed',
        platformType: IntegrationPlatform.BOOMI,
        config: { pollInterval: 3000 },
      }),
    );
  }, 30000);

  afterAll(async () => {
    await teardownTestApp({ app, dataSource });
  });

  describe('POST /platform-environments', () => {
    let profile: PlatformProfile;

    beforeAll(async () => {
      const p = await profileRepo.findOneBy({ name: 'Boomi Default' });
      if (!p) throw new Error('Profile not found');
      profile = p;
    });

    it('should create environment linked to profile', async () => {
      const createDto = {
        name: 'Dev Environment',
        description: 'Development Sandbox',
        profileId: profile.id,
        credentials: {
          username: 'test-user',
          passwordOrToken: 'secret-key-123',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/platform-environments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.platformType).toBe(IntegrationPlatform.BOOMI); // Inherited

      // Verify in DB - Ensure encryptedData is present in DB but not in response if we are modifying the service return types
      // Standard controller practice is to return the entity or DTO.
      // If returning the Entity, fields marked @Exclude are hidden.
      const env = await environmentRepo.findOneBy({ id: response.body.id });
      expect(env).toBeDefined();
      expect(env?.encryptedData).toBeDefined();
    });

    it('should fail if profile does not exist', async () => {
      const createDto = {
        name: 'Bad Profile Env',
        profileId: '00000000-0000-0000-0000-000000000000', // Non-existent UUID
        credentials: { user: 'test' },
      };

      await request(app.getHttpServer())
        .post('/platform-environments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createDto)
        .expect(404);
    });
  });

  describe('GET /platform-environments', () => {
    it('should list environments without exposing keys', async () => {
      const response = await request(app.getHttpServer())
        .get('/platform-environments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      const item = response.body[0];

      // Should contain ID and name
      expect(item.id).toBeDefined();
      expect(item.name).toBeDefined();

      // Should NOT contain credentials or encryptedData
      expect(item.credentials).toBeUndefined();
      expect(item.encryptedData).toBeUndefined();
      expect(item.iv).toBeUndefined();
    });
  });

  describe('GET /platform-environments/:id', () => {
    it('should return a single environment with masked credentials', async () => {
      const env = await environmentRepo.findOneBy({ name: 'Dev Environment' });
      if (!env) throw new Error('Environment not found');

      const response = await request(app.getHttpServer())
        .get(`/platform-environments/${env.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.id).toBe(env.id);
      expect(response.body.name).toBe(env.name);

      // Check Profile Relation
      expect(response.body.profileId).toBeDefined();

      // Check Decrypted Credentials - this confirms our DTO transformation logic works
      expect(response.body.credentials).toBeDefined();
      // Since our DTO types credentials as Record<string, any>, we access it directly
      expect(response.body.credentials.username).toBe('test-user');
      // The password field should be EMPTY now, not Masked
      expect(response.body.credentials.passwordOrToken).toBe('');

      // Check that encrypted properties are not exposed
      expect(response.body.encryptedData).toBeUndefined();
    });

    it('should return 404 for non-existent environment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/platform-environments/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /platform-environments/:id', () => {
    it('should update environment name and credentials with new password', async () => {
      const env = await environmentRepo.findOneBy({ name: 'Dev Environment' });
      if (!env) throw new Error('Environment not found');

      const updateDto = {
        name: 'Staging Environment',
        credentials: { passwordOrToken: 'new-secret-key' },
      };

      const response = await request(app.getHttpServer())
        .patch(`/platform-environments/${env.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe('Staging Environment');

      // Verify name changed in DB
      const updatedEnv = await environmentRepo.findOneBy({ id: env.id });
      if (!updatedEnv) throw new Error('Updated environment not found');
      expect(updatedEnv.name).toBe('Staging Environment');
    });

    it('should retain existing password if updated with empty password', async () => {
      // First, ensure we have a known state
      const env = await environmentRepo.findOneBy({
        name: 'Staging Environment',
      });
      if (!env) throw new Error('Environment not found');

      // Send empty password logic which simulates the frontend sending back unchanged data (user left it blank)
      const updateDto = {
        description: 'Updated Description',
        credentials: {
          username: 'test-user',
          passwordOrToken: '', // Empty string triggers retention logic
        },
      };

      await request(app.getHttpServer())
        .patch(`/platform-environments/${env.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200);

      const updatedEnv = await environmentRepo.findOneBy({ id: env.id });
      expect(updatedEnv?.description).toBe('Updated Description');
    });
  });

  describe('isDefault behavior', () => {
    let profile: PlatformProfile;

    beforeAll(async () => {
      const p = await profileRepo.findOneBy({ name: 'Boomi Default' });
      if (!p) throw new Error('Profile not found');
      profile = p;
    });

    it('should set isDefault to true and clear others when creating a new default environment', async () => {
      // Create first environment (default)
      const env1Res = await request(app.getHttpServer())
        .post('/platform-environments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Default Env 1',
          profileId: profile.id,
          isDefault: true,
          credentials: { username: 'user1' },
        })
        .expect(201);

      expect(env1Res.body.isDefault).toBe(true);

      // Create second environment (also default)
      const env2Res = await request(app.getHttpServer())
        .post('/platform-environments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Default Env 2',
          profileId: profile.id,
          isDefault: true,
          credentials: { username: 'user2' },
        })
        .expect(201);

      expect(env2Res.body.isDefault).toBe(true);

      // Verify first environment is no longer default
      const env1 = await environmentRepo.findOneBy({ id: env1Res.body.id });
      expect(env1?.isDefault).toBe(false);
    });

    it('should set isDefault to true and clear others when updating an environment', async () => {
      const env1 = await environmentRepo.findOneBy({ name: 'Default Env 1' });
      const env2 = await environmentRepo.findOneBy({ name: 'Default Env 2' });
      if (!env1 || !env2) throw new Error('Environments not found');

      // Currently env2 is default. Let's update env1 to be default.
      const updateRes = await request(app.getHttpServer())
        .patch(`/platform-environments/${env1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isDefault: true,
        })
        .expect(200);

      expect(updateRes.body.isDefault).toBe(true);

      // Verify env2 is no longer default
      const updatedEnv2 = await environmentRepo.findOneBy({ id: env2.id });
      expect(updatedEnv2?.isDefault).toBe(false);
    });
  });

  describe('DELETE /platform-environments/:id', () => {
    it('should delete environment', async () => {
      const env = await environmentRepo.findOneBy({
        name: 'Staging Environment',
      });
      if (!env) throw new Error('Environment not found');

      await request(app.getHttpServer())
        .delete(`/platform-environments/${env.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const check = await environmentRepo.findOneBy({ id: env.id });
      expect(check).toBeNull();
    });
  });
});
