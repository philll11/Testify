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
import { TestExecutionResult } from '../../src/execution-engine/entities/test-execution-result.entity';


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

    describe('POST /collections', () => {
        it('should successfully create a TARGETS collection', async () => {
            const compRepo = dataSource.getRepository(DiscoveredComponent);
            await compRepo.save([
                { componentId: 'comp-1', profileId: 'prof-1', name: 'process1', platform: 'Boomi', type: 'PROCESS', isTest: false },
                { componentId: 'comp-2', profileId: 'prof-1', name: 'process2', platform: 'Boomi', type: 'PROCESS', isTest: false },
            ]);

            const payload = {
                name: 'My Target Execution Plan',
                collectionType: CollectionType.TARGETS,
                componentIds: ['comp-1', 'comp-2'],
            };

            const res = await request(app.getHttpServer())
                .post('/collections')
                .set('Authorization', 'Bearer ' + adminToken)
                .send(payload)
                .expect(201);

            expect(res.body.id).toBeDefined();
        });

        it('should drop 400 if NONE of the component IDs are discovered', async () => {
            const payload = {
                name: 'Missing Components Plan',
                collectionType: CollectionType.TARGETS,
                componentIds: ['comp-unknown-1', 'comp-unknown-2'],
            };

            const res = await request(app.getHttpServer())
                .post('/collections')
                .set('Authorization', 'Bearer ' + adminToken)
                .send(payload)
                .expect(400);
        });

        it('should drop 400 if a TESTS collection includes non-test components', async () => {
            const compRepo = dataSource.getRepository(DiscoveredComponent);
            await compRepo.save([
                { componentId: 'test-1', profileId: 'prof-1', name: 't1', type: 'TEST', isTest: true },
                { componentId: 'comp-1', profileId: 'prof-1', name: 'process1', type: 'PROCESS', isTest: false },
            ]);

            const payload = {
                name: 'Mixed Tests Plan',
                collectionType: CollectionType.TESTS,
                componentIds: ['test-1', 'comp-1'],
            };

            const res = await request(app.getHttpServer())
                .post('/collections')
                .set('Authorization', 'Bearer ' + adminToken)
                .send(payload)
                .expect(400);
        });

        it('should drop 400 if componentIds array is empty via Class-Validator guard', async () => {
            const payload = {
                name: 'Empty Array Plan',
                collectionType: CollectionType.TARGETS,
                componentIds: [],
            };

            const res = await request(app.getHttpServer())
                .post('/collections')
                .set('Authorization', 'Bearer ' + adminToken)
                .send(payload)
                .expect(400);
        });
        it('should enqueue a crawler job if crawlDependencies is true in a TARGETS collection', async () => {
            const compRepo = dataSource.getRepository(DiscoveredComponent);
            await compRepo.save([
                { componentId: 'comp-crawl-1', profileId: 'prof-1', name: 'process1', platform: 'Boomi', type: 'PROCESS', isTest: false },
            ]);

            const payload = {
                name: 'Crawl Plan',
                collectionType: CollectionType.TARGETS,
                componentIds: ['comp-crawl-1'],
                crawlDependencies: true,
                environmentId: '00000000-0000-0000-0000-000000000000' // valid UUID
            };

            const res = await request(app.getHttpServer())
                .post('/collections')
                .set('Authorization', 'Bearer ' + adminToken)
                .send(payload)
                .expect(201);

            expect(res.body.id).toBeDefined();
        });
    });

    describe('GET /collections/:id', () => {
        it('should return nested manifest with empty tests for TARGETS collection if no tests map in TestRegistry', async () => {
            const compRepo = dataSource.getRepository(DiscoveredComponent);
            await compRepo.save([
                { componentId: 'target-no-test', profileId: 'prof-1', name: 'Process 1', platform: 'Boomi', type: 'PROCESS', isTest: false },
            ]);

            const payload = {
                name: 'Targets Plan No Tests',
                collectionType: CollectionType.TARGETS,
                componentIds: ['target-no-test'],
            };

            const createRes = await request(app.getHttpServer())
                .post('/collections')
                .set('Authorization', 'Bearer ' + adminToken)
                .send(payload)
                .expect(201);

            const res = await request(app.getHttpServer())
                .get('/collections/' + createRes.body.id)
                .set('Authorization', 'Bearer ' + adminToken)
                .expect(200);

            expect(res.body.manifest).toBeDefined();
            expect(res.body.manifest.length).toBe(1);
            expect(res.body.manifest[0].targetId).toBe('target-no-test');
            expect(res.body.manifest[0].tests).toBeDefined();
            expect(res.body.manifest[0].tests.length).toBe(0);
        });

        it('should return a flat manifest for TESTS collection', async () => {
            const compRepo = dataSource.getRepository(DiscoveredComponent);
            await compRepo.save([
                { componentId: 'test-1', profileId: 'prof-1', name: 'Test 1', platform: 'Boomi', type: 'TEST', isTest: true },
                { componentId: 'test-2', profileId: 'prof-1', name: 'Test 2', platform: 'Boomi', type: 'TEST', isTest: true },
            ]);

            const payload = {
                name: 'Tests Plan',
                collectionType: CollectionType.TESTS,
                componentIds: ['test-1', 'test-2'],
            };

            const createRes = await request(app.getHttpServer())
                .post('/collections')
                .set('Authorization', 'Bearer ' + adminToken)
                .send(payload)
                .expect(201);

            const res = await request(app.getHttpServer())
                .get('/collections/' + createRes.body.id)
                .set('Authorization', 'Bearer ' + adminToken)
                .expect(200);

            expect(res.body.manifest).toBeDefined();
            expect(res.body.manifest.length).toBe(2);
        });

        it('should return a nested manifest for TARGETS collection via TestRegistry joins', async () => {
            const compRepo = dataSource.getRepository(DiscoveredComponent);
            await compRepo.save([
                { componentId: 'target-1', profileId: 'prof-1', name: 'Process 1', platform: 'Boomi', type: 'PROCESS', isTest: false },
                { componentId: 'test-1A', profileId: 'prof-1', name: 'Test 1A', platform: 'Boomi', type: 'TEST', isTest: true },
                { componentId: 'test-1B', profileId: 'prof-1', name: 'Test 1B', platform: 'Boomi', type: 'TEST', isTest: true },
            ]);

            const registryRepo = dataSource.getRepository(TestRegistry);
            await registryRepo.save([
                { targetComponentId: 'target-1', testComponentId: 'test-1A', correlationId: 'c1' },
                { targetComponentId: 'target-1', testComponentId: 'test-1B', correlationId: 'c2' }
            ]);

            const payload = {
                name: 'Targets Plan',
                collectionType: CollectionType.TARGETS,
                componentIds: ['target-1'],
            };

            const createRes = await request(app.getHttpServer())
                .post('/collections')
                .set('Authorization', 'Bearer ' + adminToken)
                .send(payload)
                .expect(201);

            const res = await request(app.getHttpServer())
                .get('/collections/' + createRes.body.id)
                .set('Authorization', 'Bearer ' + adminToken)
                .expect(200);

            expect(res.body.manifest).toBeDefined();
            expect(res.body.manifest.length).toBe(1);
            expect(res.body.manifest[0].targetId).toBe('target-1');
            expect(res.body.manifest[0].tests).toBeDefined();
            expect(res.body.manifest[0].tests.length).toBe(2);
        });

        it('should return a flat manifest with empty array if collection has no items', async () => {
            const payload = {
                name: 'Empty Plan',
                collectionType: CollectionType.TARGETS,
                componentIds: [], // We'd get a 400 normally, let's bypass DTO guard by creating it manually
            };

            // For testing the service logic correctly, we need an empty collection.
            const collectionRepo = dataSource.getRepository('Collection');
            const savedCollection = await collectionRepo.save({
                name: 'Empty Plan Direct',
                collectionType: CollectionType.TARGETS,
                status: CollectionStatus.AWAITING_SELECTION,
                items: []
            });

            const res = await request(app.getHttpServer())
                .get('/collections/' + savedCollection.id)
                .set('Authorization', 'Bearer ' + adminToken)
                .expect(200);

            expect(res.body.manifest).toBeDefined();
            expect(res.body.manifest.length).toBe(0);
        });

        it('should return 404 if collection is not found', async () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';
            await request(app.getHttpServer())
                .get('/collections/' + fakeId)
                .set('Authorization', 'Bearer ' + adminToken)
                .expect(404);
        });
    });

    describe('GET /collections', () => {
        it('should return an array of collections ordered by createdAt DESC', async () => {
            const collectionRepo = dataSource.getRepository('Collection');
            await collectionRepo.save([
                { name: 'Plan A', collectionType: CollectionType.TARGETS, status: CollectionStatus.AWAITING_SELECTION, createdAt: new Date('2023-01-01T10:00:00Z') },
                { name: 'Plan B', collectionType: CollectionType.TARGETS, status: CollectionStatus.AWAITING_SELECTION, createdAt: new Date('2023-01-02T10:00:00Z') }
            ]);

            const res = await request(app.getHttpServer())
                .get('/collections')
                .set('Authorization', 'Bearer ' + adminToken)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(2);
            // B should come before A due to DESC order
            expect(res.body[0].name).toBe('Plan B');
            expect(res.body[1].name).toBe('Plan A');
        });
    });

    describe('DELETE /collections/:id', () => {
        it('should successfully delete an existing collection', async () => {
            const collectionRepo = dataSource.getRepository('Collection');
            const savedCollection = await collectionRepo.save({
                name: 'ToDelete',
                collectionType: CollectionType.TARGETS,
                status: CollectionStatus.AWAITING_SELECTION,
                items: []
            });

            await request(app.getHttpServer())
                .delete('/collections/' + savedCollection.id)
                .set('Authorization', 'Bearer ' + adminToken)
                .expect(200);

            const fetched = await collectionRepo.findOne({ where: { id: savedCollection.id } });
            expect(fetched).toBeNull();
        });

        it('should return 404 if collection to delete is not found', async () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';
            await request(app.getHttpServer())
                .delete('/collections/' + fakeId)
                .set('Authorization', 'Bearer ' + adminToken)
                .expect(404);
        });
    });
});
