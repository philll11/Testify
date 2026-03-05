import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { CollectionType, CollectionStatus } from '../../src/collections/enums/collection.enums';
import { User } from '../../src/iam/users/entities/user.entity';
import { Role } from '../../src/iam/roles/entities/role.entity';
import { DiscoveredComponent } from '../../src/discovery/entities/discovered-component.entity';
import { TestRegistry } from '../../src/test-registry/entities/test-registry.entity';
import { PlatformProfile } from '../../src/integration/platform-profile/entities/platform-profile.entity';
import { PlatformEnvironment } from '../../src/integration/platform-environment/entities/platform-environment.entity';
import { IntegrationPlatform } from '../../src/integration/constants/integration-platform.enum';
import { TestExecutionResult, TestExecutionStatus } from '../../src/execution-engine/entities/test-execution-result.entity';
import { IntegrationService } from '../../src/integration/integration.service';

describe('CollectionsModule (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let jwtService: JwtService;

    let adminToken: string;
    let adminUserId: string;

    beforeAll(async () => {
        const testApp = await setupTestApp();
        app = testApp.app;
        dataSource = testApp.dataSource;
        jwtService = testApp.jwtService;

        const roleRepo = dataSource.getRepository(Role);
        const adminRole = roleRepo.create({
            recordId: 'ADMIN_ROLE',
            name: 'SuperAdmin',
            permissions: Object.values(PERMISSIONS),
        });
        await roleRepo.save(adminRole);

        const userRepo = dataSource.getRepository(User);
        const adminUser = userRepo.create({
            recordId: 'ADMIN_USER',
            name: 'Admin',
            email: 'admin_collections@example.com',
            firstName: 'Admin',
            lastName: 'User',
            role: adminRole,
        });
        await userRepo.save(adminUser);

        adminUserId = adminUser.id;
        adminToken = jwtService.sign({
            sub: adminUser.recordId,
            email: adminUser.email,
            tokenVersion: 0
        });
    });

    afterAll(async () => {
        await teardownTestApp({ app, dataSource });
    });

    afterEach(async () => {
        const collectionRepo = dataSource.getRepository('Collection');
        await collectionRepo.query('TRUNCATE TABLE "collections" CASCADE;');

        const componentRepo = dataSource.getRepository(DiscoveredComponent);
        await componentRepo.query('TRUNCATE TABLE "discovered_components" CASCADE;');

        const testRegistryRepo = dataSource.getRepository(TestRegistry);
        await testRegistryRepo.query('TRUNCATE TABLE "test_registry" CASCADE;');

        const executionResultRepo = dataSource.getRepository(TestExecutionResult);
        await executionResultRepo.query('TRUNCATE TABLE "test_execution_results" CASCADE;');

        await dataSource.query('TRUNCATE TABLE "platform_environments" CASCADE;');
        await dataSource.query('TRUNCATE TABLE "platform_profiles" CASCADE;');
    });

    describe('POST /collections/:id/execute', () => {
        let testProfileId: string;
        let testEnvId: string;

        beforeEach(async () => {
            // Setup Profile and Environment for Execution Engine to pass
            const profileRepo = dataSource.getRepository(PlatformProfile);
            const savedProfile = await profileRepo.save({
                name: 'E2E Boomi Profile',
                platformType: IntegrationPlatform.BOOMI,
            });
            testProfileId = savedProfile.id;

            const envRepo = dataSource.getRepository(PlatformEnvironment);
            const savedEnv = await envRepo.save({
                name: 'E2E Testing Environment',
                profileId: testProfileId,
                platformType: IntegrationPlatform.BOOMI,
                authType: 'BASIC',
                encryptedData: 'mock-encrypted-data',
                iv: 'mock-iv-string',
            });
            testEnvId = savedEnv.id;
        });

        it('should validate profile mismatch and prevent cross-environment execution', async () => {
            // 1. Create a Component tied to a DIFFERENT profile
            const compRepo = dataSource.getRepository(DiscoveredComponent);
            await compRepo.save([
                { componentId: 'comp-100', profileId: 'diff-prof-id', name: 'targetA', platform: 'Boomi', type: 'PROCESS', isTest: false }
            ]);

            // 2. Create the Collection tied to that component
            const createRes = await request(app.getHttpServer())
                .post('/collections')
                .set('Authorization', 'Bearer ' + adminToken)
                .send({
                    name: 'Mismatched Env Test',
                    collectionType: CollectionType.TARGETS,
                    componentIds: ['comp-100'],
                })
                .expect(201);

            const collectionId = createRes.body.id;

            // 3. Act & Assert: Execute should fail because 'diff-prof-id' != 'testProfileId'
            await request(app.getHttpServer())
                .post(`/collections/${collectionId}/execute`)
                .set('Authorization', 'Bearer ' + adminToken)
                .send({ environmentId: testEnvId })
                .expect(400) // Expect Bad Request due to profile mismatch
                .expect(res => {
                    expect(res.body.message).toContain('profile mismatch');
                });
        });

        it('should successfully dispatch job to execution engine and generate db rows', async () => {
            // Mock the external integration calls
            const integrationService = app.get(IntegrationService);
            jest.spyOn(integrationService, 'getServiceById').mockImplementation(async () => {
                return {
                    initiateTestExecution: jest.fn().mockResolvedValue('fake-ext-id-123'),
                    checkTestExecutionStatus: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
                    searchComponents: jest.fn(),
                    testConnection: jest.fn().mockResolvedValue(true),
                    executeTestProcess: jest.fn(),
                } as any;
            });

            // 1. Create a Component tied to the CORRECT profile
            const compRepo = dataSource.getRepository(DiscoveredComponent);
            await compRepo.save([
                { componentId: 'comp-ext-1234', profileId: testProfileId, name: 'validTarget', platform: 'Boomi', type: 'PROCESS', isTest: false },
                { componentId: 'comp-ext-5678', profileId: testProfileId, name: 'validTarget2', platform: 'Boomi', type: 'PROCESS', isTest: false }
            ]);

            // 2. Create the Collection
            const createRes = await request(app.getHttpServer())
                .post('/collections')
                .set('Authorization', 'Bearer ' + adminToken)
                .send({
                    name: 'Valid Execution Run',
                    collectionType: CollectionType.TARGETS,
                    componentIds: ['comp-ext-1234', 'comp-ext-5678'],
                })
                .expect(201);

            const collectionId = createRes.body.id;

            // 3. Execute
            const res = await request(app.getHttpServer())
                .post(`/collections/${collectionId}/execute`)
                .set('Authorization', 'Bearer ' + adminToken)
                .send({ environmentId: testEnvId })
                .expect(201);

            // 4. Validate DB records were created by the Execution Engine Queue Service
            const executionResultRepo = dataSource.getRepository(TestExecutionResult);

            // Wait for up to 3 seconds for the background worker to process the job and hit the running state
            const start = Date.now();
            let results: TestExecutionResult[] = [];
            while (Date.now() - start < 3000) {
                results = await executionResultRepo.find({ where: { collectionId } });
                // With our mocked service, the initial job processor flips the status from PENDING to RUNNING instantly
                // It then queues a delayed poll-test job, but we don't wait 10 seconds for that.
                if (results.length === 2 && results.every(r => r.status === TestExecutionStatus.RUNNING)) {
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 100)); // sleep 100ms
            }

            expect(results).toHaveLength(2); // Two items were in the array
            expect(results.some(r => r.testId === 'comp-ext-1234')).toBeTruthy();
            expect(results.some(r => r.testId === 'comp-ext-5678')).toBeTruthy();
            expect(results[0].status).toBe(TestExecutionStatus.RUNNING); // Started status successfully hit our mock!
        });

        it('should return 404 if the collection is not found', async () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';
            await request(app.getHttpServer())
                .post(`/collections/${fakeId}/execute`)
                .set('Authorization', 'Bearer ' + adminToken)
                .send({ environmentId: testEnvId })
                .expect(404);
        });

        it('should return 400 if the environment is not found', async () => {
            // Create a valid collection first
            const compRepo = dataSource.getRepository(DiscoveredComponent);
            await compRepo.save([
                { componentId: 'comp-ext-env-test', profileId: testProfileId, name: 'validTarget', platform: 'Boomi', type: 'PROCESS', isTest: false }
            ]);

            const createRes = await request(app.getHttpServer())
                .post('/collections')
                .set('Authorization', 'Bearer ' + adminToken)
                .send({
                    name: 'Bad Env Run',
                    collectionType: CollectionType.TARGETS,
                    componentIds: ['comp-ext-env-test'],
                })
                .expect(201);

            const collectionId = createRes.body.id;
            const fakeEnvId = '00000000-0000-0000-0000-000000000000';

            await request(app.getHttpServer())
                .post(`/collections/${collectionId}/execute`)
                .set('Authorization', 'Bearer ' + adminToken)
                .send({ environmentId: fakeEnvId })
                .expect(400)
                .expect(res => {
                    expect(res.body.message).toContain('Environment with ID');
                });
        });

        it('should successfully dispatch job if the collection has no items and bypass mismatch validation', async () => {
            // 1. Create an empty collection manually (bypass DTO limits)
            const collectionRepo = dataSource.getRepository('Collection');
            const emptyCollection = await collectionRepo.save({
                name: 'Empty Execution Plan',
                collectionType: CollectionType.TARGETS,
                status: CollectionStatus.AWAITING_SELECTION,
                items: []
            });

            // 3. Execute
            await request(app.getHttpServer())
                .post(`/collections/${emptyCollection.id}/execute`)
                .set('Authorization', 'Bearer ' + adminToken)
                .send({ environmentId: testEnvId })
                .expect(201); // Created execution job
        });
    });
});
