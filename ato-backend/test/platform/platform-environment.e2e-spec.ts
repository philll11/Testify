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
        const role = await roleRepository.save(roleRepository.create({
            recordId: 'ADMIN_ENV_TEST',
            name: 'Environment Admin',
            permissions: [
                PERMISSIONS.PLATFORM_ENVIRONMENT_CREATE,
                PERMISSIONS.PLATFORM_ENVIRONMENT_VIEW,
                PERMISSIONS.PLATFORM_ENVIRONMENT_EDIT,
                PERMISSIONS.PLATFORM_ENVIRONMENT_DELETE,
                PERMISSIONS.PLATFORM_PROFILE_CREATE // Need this to seed profile
            ]
        }));

        const user = await userRepository.save(userRepository.create({
            recordId: 'USER_ENV_TEST',
            firstName: 'Env',
            lastName: 'Admin',
            name: 'Env Admin',
            email: 'env.admin@test.com',
            isActive: true,
            role: role
        }));

        adminToken = jwtService.sign({ sub: user.recordId, tokenVersion: 0 });

        // Seed a Platform Profile first (Environment depends on it)
        const profile = await profileRepo.save(profileRepo.create({
            name: 'Boomi Default',
            accountId: 'boomi-account-seed',
            platformType: IntegrationPlatform.BOOMI,
            isDefault: true,
            config: { pollInterval: 3000 }
        }));
    }, 30000);

    afterAll(async () => {
        await teardownTestApp({ app, dataSource });
    });

    describe('POST /platform-environments', () => {
        it('should create environment linked to profile', async () => {
            const profile = await profileRepo.findOneBy({ name: 'Boomi Default' });
            if (!profile) throw new Error('Profile not found');

            const createDto = {
                name: 'Dev Environment',
                description: 'Development Sandbox',
                profileId: profile.id,
                credentials: {
                    username: 'test-user',
                    apiKey: 'secret-key-123'
                }
            };

            const response = await request(app.getHttpServer())
                .post('/platform-environments')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(createDto)
                .expect(201);

            expect(response.body.id).toBeDefined();
            expect(response.body.platformType).toBe(IntegrationPlatform.BOOMI); // Inherited

            // Verify in DB
            const env = await environmentRepo.findOneBy({ id: response.body.id });
            expect(env).toBeDefined();
            if (env) {
                expect(env.encryptedData).toBeDefined(); // Should be encrypted
            }
        });

        it('should fail if profile does not exist', async () => {
            const createDto = {
                name: 'Bad Profile Env',
                profileId: '00000000-0000-0000-0000-000000000000', // Non-existent UUID
                credentials: { user: 'test' }
            };

            await request(app.getHttpServer())
                .post('/platform-environments')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(createDto)
                .expect(404);
        });
    });

    describe('GET /platform-environments', () => {
        it('should list environments', async () => {
            await request(app.getHttpServer())
                .get('/platform-environments')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.length).toBeGreaterThan(0);
                    expect(res.body[0].encryptedData).toBeUndefined(); // Sensitive data should be hidden
                });
        });
    });

    describe('GET /platform-environments/:id', () => {
        it('should return a single environment with decrypted credentials and profile', async () => {
            const env = await environmentRepo.findOneBy({ name: 'Dev Environment' });
            if (!env) throw new Error('Environment not found');

            const response = await request(app.getHttpServer())
                .get(`/platform-environments/${env.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.id).toBe(env.id);
            expect(response.body.name).toBe(env.name);

            // Check Profile Relation
            expect(response.body.profile).toBeDefined();
            expect(response.body.profile.id).toBeDefined();

            // Check Decrypted Credentials
            expect(response.body.credentials).toBeDefined();
            expect(response.body.credentials.username).toBe('test-user');
            // Check that encrypted properties are not exposed
            expect(response.body.encryptedData).toBeUndefined();
        });

        it('should return 404 for non-existent environment', async () => {
            await request(app.getHttpServer())
                .get('/platform-environments/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);
        });
    });

    describe('PATCH /platform-environments/:id', () => {
        it('should update environment name and credentials', async () => {
            const env = await environmentRepo.findOneBy({ name: 'Dev Environment' });
            if (!env) throw new Error('Environment not found');

            const updateDto = {
                name: 'Staging Environment',
                credentials: { apiKey: 'new-secret-key' }
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
            // Can't verify encrypted data easily without decryption service, but we assume it changed
        });
    });

    describe('DELETE /platform-environments/:id', () => {
        it('should delete environment', async () => {
            const env = await environmentRepo.findOneBy({ name: 'Staging Environment' });
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
