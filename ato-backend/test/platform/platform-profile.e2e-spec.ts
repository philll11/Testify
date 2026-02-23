import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { setupTestApp, teardownTestApp } from '../test-utils';
import { PlatformProfile } from '../../src/integration/platform-profile/entities/platform-profile.entity';
import { User } from '../../src/iam/users/entities/user.entity';
import { Role } from '../../src/iam/roles/entities/role.entity';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { IntegrationPlatform } from '../../src/integration/constants/integration-platform.enum';

describe('Platform Profile E2E', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let jwtService: JwtService;
    let profileRepository: Repository<PlatformProfile>;
    let userRepository: Repository<User>;
    let roleRepository: Repository<Role>;

    let adminToken: string;
    let unauthorizedToken: string;

    beforeAll(async () => {
        const setup = await setupTestApp();
        app = setup.app;
        dataSource = setup.dataSource;
        jwtService = setup.jwtService;

        profileRepository = dataSource.getRepository(PlatformProfile);
        userRepository = dataSource.getRepository(User);
        roleRepository = dataSource.getRepository(Role);

        // Create Admin Role
        const adminRole = await roleRepository.save(roleRepository.create({
            recordId: 'ROLE_PROF_ADMIN',
            name: 'Profile Admin',
            permissions: [
                PERMISSIONS.PLATFORM_PROFILE_CREATE,
                PERMISSIONS.PLATFORM_PROFILE_VIEW,
                PERMISSIONS.PLATFORM_PROFILE_EDIT,
                PERMISSIONS.PLATFORM_PROFILE_DELETE,
            ],
        }));

        // Create Admin User
        const adminUser = await userRepository.save(userRepository.create({
            recordId: 'USER_PROF_ADMIN',
            firstName: 'Profile',
            lastName: 'Admin',
            name: 'Profile Admin',
            email: 'profile.admin@example.com',
            isActive: true,
            role: adminRole,
        }));

        adminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });

        // Create Unauthorized Role/User
        const viewerRole = await roleRepository.save(roleRepository.create({
            recordId: 'ROLE_PROF_VIEWER',
            name: 'Profile Viewer',
            permissions: [PERMISSIONS.PLATFORM_PROFILE_VIEW], // View only
        }));

        const viewerUser = await userRepository.save(userRepository.create({
            recordId: 'USER_PROF_VIEWER',
            firstName: 'Profile',
            lastName: 'Viewer',
            name: 'Profile Viewer',
            email: 'profile.viewer@example.com',
            isActive: true,
            role: viewerRole,
        }));

        unauthorizedToken = jwtService.sign({ sub: viewerUser.recordId, tokenVersion: 0 });
    });

    afterAll(async () => {
        await teardownTestApp({ app, dataSource });
    });

    describe('POST /platform-profiles', () => {
        it('should create a new platform profile', async () => {
            const createDto = {
                name: 'Boomi Standard',
                accountId: 'boomi-account-123',
                description: 'Standard Boomi configuration',
                platformType: IntegrationPlatform.BOOMI,
                isDefault: true,
                config: { pollInterval: 2000, maxRetries: 3 }
            };

            const response = await request(app.getHttpServer())
                .post('/platform-profiles')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(createDto)
                .expect(201);

            expect(response.body.id).toBeDefined();
            expect(response.body.name).toBe(createDto.name);
            expect(response.body.isDefault).toBe(true);

            // Verify DB
            const saved = await profileRepository.findOneBy({ name: createDto.name });
            expect(saved).toBeDefined();
            if (saved) {
                expect(saved.config).toEqual(createDto.config);
            }
        });

        it('should validation error for invalid DTO', async () => {
            const invalidDto = {
                name: '', // Empty name
                platformType: 'INVALID_PLATFORM'
            };

            await request(app.getHttpServer())
                .post('/platform-profiles')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidDto)
                .expect(400);
        });

        it('should forbid user without CREATE permission', async () => {
            const createDto = {
                name: 'Unauthorized Profile',
                platformType: IntegrationPlatform.BOOMI,
            };

            await request(app.getHttpServer())
                .post('/platform-profiles')
                .set('Authorization', `Bearer ${unauthorizedToken}`)
                .send(createDto)
                .expect(403);
        });
    });

    describe('GET /platform-profiles', () => {
        it('should return list of profiles', async () => {
            await request(app.getHttpServer())
                .get('/platform-profiles')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    expect(res.body.length).toBeGreaterThan(0);
                });
        });
    });

    describe('PATCH /platform-profiles/:id', () => {
        it('should update profile configuration', async () => {
            // Get existing profile
            const profile = await profileRepository.findOneBy({ name: 'Boomi Standard' });
            if (!profile) throw new Error('Profile not found');

            const updateDto = {
                config: { pollInterval: 5000 }, // Partial config update
                description: 'Updated description'
            };

            const response = await request(app.getHttpServer())
                .patch(`/platform-profiles/${profile.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(200);

            expect(response.body.description).toBe(updateDto.description);
            // Check if config merged/updated correctly
            expect(response.body.config.pollInterval).toBe(5000);
            expect(response.body.config.maxRetries).toBe(3); // Should persist old value
        });
    });

    describe('DELETE /platform-profiles/:id', () => {
        it('should delete a profile', async () => {
            const profile = await profileRepository.save(profileRepository.create({
                name: 'To Be Deleted',
                platformType: IntegrationPlatform.BOOMI,
            }));

            await request(app.getHttpServer())
                .delete(`/platform-profiles/${profile.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            const check = await profileRepository.findOneBy({ id: profile.id });
            expect(check).toBeNull();
        });
    });
});
