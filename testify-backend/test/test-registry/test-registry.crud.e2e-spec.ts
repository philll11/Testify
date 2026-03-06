import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { User } from '../../src/iam/users/entities/user.entity';
import { Role } from '../../src/iam/roles/entities/role.entity';
import { TestRegistry } from '../../src/test-registry/entities/test-registry.entity';
import { CreateTestRegistryDto } from '../../src/test-registry/dto/create-test-registry.dto';

describe('TestRegistry CRUD (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let jwtService: JwtService;
    let testRegistryQueue: Queue;

    // Repositories
    let userRepository: Repository<User>;
    let roleRepository: Repository<Role>;
    let testRegistryRepository: Repository<TestRegistry>;

    // Personas
    let globalAdminToken: string;
    let unauthorizedToken: string;
    let testProfileId: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        const setup = await setupTestApp();
        app = setup.app;
        dataSource = setup.dataSource;
        jwtService = setup.jwtService;

        userRepository = dataSource.getRepository(User);
        roleRepository = dataSource.getRepository(Role);
        testRegistryRepository = dataSource.getRepository(TestRegistry);
        testRegistryQueue = app.get<Queue>(getQueueToken('test-registry-tasks'));

        // 1. Create GLOBAL_ADMIN
        const globalAdminRole = await roleRepository.save(
            roleRepository.create({
                recordId: 'GLOBAL_ADMIN_REGISTRY_CRUD',
                name: 'Global Admin Registry CRUD',
                permissions: Object.values(PERMISSIONS),
            }),
        );

        const globalAdmin = await userRepository.save(
            userRepository.create({
                recordId: 'ADMIN_REG_CRUD',
                name: 'Global Admin Registry',
                firstName: 'Global',
                lastName: 'Admin',
                email: 'admin.registry.crud@test.com',
                role: globalAdminRole,
            }),
        );

        globalAdminToken = jwtService.sign({
            sub: globalAdmin.recordId,
            tokenVersion: 0,
        });

        // 2. Create Unauthorized User
        const unauthorizedRole = await roleRepository.save(
            roleRepository.create({
                recordId: 'UNAUTH_ROLE_REGISTRY',
                name: 'Unauthorized Role Registry',
                permissions: [], // No permissions
            }),
        );

        const unauthorizedUser = await userRepository.save(
            userRepository.create({
                recordId: 'UNAUTH_USER_REG',
                name: 'Unauthorized User',
                firstName: 'Unauthorized',
                lastName: 'User',
                email: 'unauth.registry@test.com',
                role: unauthorizedRole,
            }),
        );

        unauthorizedToken = jwtService.sign({
            sub: unauthorizedUser.recordId,
            tokenVersion: 0,
        });

        // Generate a random UUID for profileId since it's just a foreign key ID (in this context we might not need the actual profile table populated if constraints aren't strict, but let's assume UUID is enough)
        testProfileId = '123e4567-e89b-12d3-a456-426614174000';
    });

    afterAll(async () => {
        await teardownTestApp({ app, dataSource });
    });

    beforeEach(async () => {
        // Clear out test registry mappings before each test to ensure isolation
        await testRegistryRepository.clear();
        jest.clearAllMocks(); // Clear spies
    });

    describe('POST /test-registry', () => {
        it('should create a new test mapping successfully and persist new fields', async () => {
            const dto: CreateTestRegistryDto = {
                profileId: testProfileId,
                targetComponentId: 'target-123',
                targetComponentName: 'Target Component',
                targetComponentPath: '/path/to/target',
                testComponentId: 'test-123',
                testComponentName: 'Test Component',
                testComponentPath: '/path/to/test'
            };

            // Spy on queue
            const queueSpy = jest.spyOn(testRegistryQueue, 'add');

            const response = await request(app.getHttpServer())
                .post('/test-registry')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(dto)
                .expect(201);

            expect(response.body).toMatchObject({
                profileId: testProfileId,
                targetComponentId: 'target-123',
                targetComponentName: 'Target Component',
                targetComponentPath: '/path/to/target',
                testComponentId: 'test-123',
                testComponentName: 'Test Component',
                testComponentPath: '/path/to/test'
            });
            expect(response.body.id).toBeDefined();

            // Verify in database
            const saved = await testRegistryRepository.findOne({ where: { id: response.body.id } });
            expect(saved).toBeDefined();
            expect(saved?.targetComponentName).toBe('Target Component');

            // Verify NO job enqueued (because environmentId was missing)
            expect(queueSpy).not.toHaveBeenCalledWith('fetch_metadata', expect.any(Object));
        });

        it('should create mapping AND enqueue sync job when environmentId is provided', async () => {
            const environmentId = '555e4567-e89b-12d3-a456-426614174555';
            const dto: CreateTestRegistryDto = {
                profileId: testProfileId,
                targetComponentId: 'target-sync',
                testComponentId: 'test-sync',
                environmentId: environmentId
            };

            const queueSpy = jest.spyOn(testRegistryQueue, 'add');

            const response = await request(app.getHttpServer())
                .post('/test-registry')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(dto)
                .expect(201);

            expect(response.body.targetComponentId).toBe('target-sync');

            // Verify job enqueued
            expect(queueSpy).toHaveBeenCalledWith('fetch_metadata', expect.objectContaining({
                id: expect.any(String),
                targetComponentId: 'target-sync',
                testComponentId: 'test-sync',
                environmentId: environmentId
            }));
        });

        it('should prevent creating a duplicate mapping (Conflict)', async () => {
            const dto: CreateTestRegistryDto = {
                profileId: testProfileId,
                targetComponentId: 'target-duplicate',
                testComponentId: 'test-duplicate',
            };

            // Seed database with mapping
            await testRegistryRepository.save(testRegistryRepository.create(dto));

            // Attempt to save again
            await request(app.getHttpServer())
                .post('/test-registry')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(dto)
                .expect(409); // ConflictException
        });

        it('should return 400 Bad Request for missing required fields', async () => {
            const invalidDto = { targetComponentId: 'only-target' }; // Missing profileId, testComponentId

            await request(app.getHttpServer())
                .post('/test-registry')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(invalidDto)
                .expect(400);
        });

        it('should deny access if lacking permissions', async () => {
            const dto = {
                profileId: testProfileId,
                targetComponentId: 'a',
                testComponentId: 'b'
            };
            await request(app.getHttpServer())
                .post('/test-registry')
                .set('Authorization', `Bearer ${unauthorizedToken}`)
                .send(dto)
                .expect(403);
        });
    });

    describe('GET /test-registry', () => {
        it('should retrieve a list of all mappings', async () => {
            await testRegistryRepository.save([
                { profileId: testProfileId, targetComponentId: 't1', testComponentId: 'test1' },
                { profileId: testProfileId, targetComponentId: 't2', testComponentId: 'test2' },
            ]);

            const response = await request(app.getHttpServer())
                .get('/test-registry')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);
        });

        it('should filter mappings by profileId', async () => {
            const otherProfileId = '999e4567-e89b-12d3-a456-426614174999';
            await testRegistryRepository.save([
                { profileId: testProfileId, targetComponentId: 't1', testComponentId: 'test1' },
                { profileId: otherProfileId, targetComponentId: 't2', testComponentId: 'test2' },
            ]);

            const response = await request(app.getHttpServer())
                .get(`/test-registry?profileId=${otherProfileId}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            expect(response.body.length).toBe(1);
            expect(response.body[0].profileId).toBe(otherProfileId);
        });
    });

    describe('GET /test-registry/target/:targetId', () => {
        it('should retrieve mappings for a specific target component', async () => {
            await testRegistryRepository.save([
                { profileId: testProfileId, targetComponentId: 'custom-target', testComponentId: 'test1' },
                { profileId: testProfileId, targetComponentId: 'custom-target', testComponentId: 'test2' },
                { profileId: testProfileId, targetComponentId: 'other-target', testComponentId: 'test3' },
            ]);

            const response = await request(app.getHttpServer())
                .get('/test-registry/target/custom-target')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            expect(response.body.length).toBe(2);
            expect(response.body[0].targetComponentId).toEqual('custom-target');
        });
    });

    describe('PATCH /test-registry/:registryId', () => {
        it('should update an existing mapping', async () => {
            const saved = await testRegistryRepository.save(
                testRegistryRepository.create({
                    profileId: testProfileId,
                    targetComponentId: 't1',
                    testComponentId: 'test1',
                    targetComponentName: 'Old Name'
                })
            );

            const updateDto = { targetComponentName: 'New Name' };

            const response = await request(app.getHttpServer())
                .patch(`/test-registry/${saved.id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateDto)
                .expect(200);

            expect(response.body.targetComponentName).toBe('New Name');

            const updated = await testRegistryRepository.findOne({ where: { id: saved.id } });
            expect(updated?.targetComponentName).toBe('New Name');
        });
    });

    describe('DELETE /test-registry/:registryId', () => {
        it('should delete a specific mapping', async () => {
            const saved = await testRegistryRepository.save(
                testRegistryRepository.create({ profileId: testProfileId, targetComponentId: 't1', testComponentId: 'ts1' })
            );

            await request(app.getHttpServer())
                .delete(`/test-registry/${saved.id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(204);

            const exists = await testRegistryRepository.findOne({ where: { id: saved.id } });
            expect(exists).toBeNull();
        });
    });

    describe('POST /test-registry/import', () => {
        it('should enqueue a bulk import job', async () => {
            const environmentId = '555e4567-e89b-12d3-a456-426614174555';
            const dto = {
                environmentId: environmentId,
                mappings: [
                    { profileId: testProfileId, targetComponentId: 't1', testComponentId: 'c1' },
                    { profileId: testProfileId, targetComponentId: 't2', testComponentId: 'c2' }
                ]
            };

            const queueSpy = jest.spyOn(testRegistryQueue, 'add');

            const response = await request(app.getHttpServer())
                .post('/test-registry/import')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(dto)
                .expect(201); // Created

            expect(response.body).toHaveProperty('message', 'Import job enqueued');
            expect(response.body).toHaveProperty('jobId');

            expect(queueSpy).toHaveBeenCalledWith('import_csv', expect.objectContaining({
                mappings: expect.arrayContaining([
                    expect.objectContaining({ targetComponentId: 't1' })
                ]),
                environmentId: environmentId
            }));
        });
    });
});
