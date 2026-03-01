import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

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

    // Repositories
    let userRepository: Repository<User>;
    let roleRepository: Repository<Role>;
    let testRegistryRepository: Repository<TestRegistry>;

    // Personas
    let globalAdminToken: string;
    let unauthorizedToken: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        const setup = await setupTestApp();
        app = setup.app;
        dataSource = setup.dataSource;
        jwtService = setup.jwtService;

        userRepository = dataSource.getRepository(User);
        roleRepository = dataSource.getRepository(Role);
        testRegistryRepository = dataSource.getRepository(TestRegistry);

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
    });

    afterAll(async () => {
        await teardownTestApp({ app, dataSource });
    });

    beforeEach(async () => {
        // Clear out test registry mappings before each test to ensure isolation
        await testRegistryRepository.clear();
    });

    describe('POST /test-registry', () => {
        it('should create a new test mapping successfully', async () => {
            const dto: CreateTestRegistryDto = {
                targetComponentId: 'target-123',
                testComponentId: 'test-123',
            };

            const response = await request(app.getHttpServer())
                .post('/test-registry')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(dto)
                .expect(201);

            expect(response.body).toMatchObject({
                targetComponentId: 'target-123',
                testComponentId: 'test-123',
            });
            expect(response.body.id).toBeDefined();

            // Verify in database
            const count = await testRegistryRepository.count();
            expect(count).toBe(1);
        });

        it('should prevent creating a duplicate mapping (Conflict)', async () => {
            const dto: CreateTestRegistryDto = {
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

        it('should return 400 Bad Request for missing fields', async () => {
            const invalidDto = { targetComponentId: 'only-target' };

            await request(app.getHttpServer())
                .post('/test-registry')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(invalidDto)
                .expect(400);
        });

        it('should deny access if lacking permissions', async () => {
            await request(app.getHttpServer())
                .post('/test-registry')
                .set('Authorization', `Bearer ${unauthorizedToken}`)
                .send({ targetComponentId: 'a', testComponentId: 'b' })
                .expect(403);
        });
    });

    describe('GET /test-registry', () => {
        it('should retrieve a list of all mappings', async () => {
            await testRegistryRepository.save([
                { targetComponentId: 't1', testComponentId: 'test1' },
                { targetComponentId: 't2', testComponentId: 'test2' },
            ]);

            const response = await request(app.getHttpServer())
                .get('/test-registry')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);
        });

        it('should deny access if lacking permissions', async () => {
            await request(app.getHttpServer())
                .get('/test-registry')
                .set('Authorization', `Bearer ${unauthorizedToken}`)
                .expect(403);
        });
    });

    describe('GET /test-registry/target/:targetId', () => {
        it('should retrieve mappings for a specific target component', async () => {
            await testRegistryRepository.save([
                { targetComponentId: 'custom-target', testComponentId: 'test1' },
                { targetComponentId: 'custom-target', testComponentId: 'test2' },
                { targetComponentId: 'other-target', testComponentId: 'test3' },
            ]);

            const response = await request(app.getHttpServer())
                .get('/test-registry/target/custom-target')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            expect(response.body.length).toBe(2);
            expect(response.body[0].targetComponentId).toEqual('custom-target');
            expect(response.body[1].targetComponentId).toEqual('custom-target');
        });
    });

    describe('DELETE /test-registry/:registryId', () => {
        it('should delete a specific mapping', async () => {
            const saved = await testRegistryRepository.save(
                testRegistryRepository.create({ targetComponentId: 't1', testComponentId: 'ts1' })
            );

            await request(app.getHttpServer())
                .delete(`/test-registry/${saved.id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(204);

            const exists = await testRegistryRepository.findOne({ where: { id: saved.id } });
            expect(exists).toBeNull();
        });

        it('should return 404 for a non-existent mapping', async () => {
            const fakeUuid = '00000000-0000-0000-0000-000000000000';
            await request(app.getHttpServer())
                .delete(`/test-registry/${fakeUuid}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(404);
        });

        it('should deny access if lacking permissions', async () => {
            const fakeUuid = '00000000-0000-0000-0000-000000000000';
            await request(app.getHttpServer())
                .delete(`/test-registry/${fakeUuid}`)
                .set('Authorization', `Bearer ${unauthorizedToken}`)
                .expect(403);
        });
    });

    describe('POST /test-registry/import', () => {
        it('should successfully bulk import new mappings', async () => {
            const dto = {
                mappings: [
                    { targetComponentId: 't1', testComponentId: 'c1' },
                    { targetComponentId: 't2', testComponentId: 'c2' }
                ]
            };

            const response = await request(app.getHttpServer())
                .post('/test-registry/import')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(dto)
                .expect(201);

            expect(response.body.length).toBe(2);

            const count = await testRegistryRepository.count();
            expect(count).toBe(2);
        });

        it('should ignore duplicate mappings gracefully during import', async () => {
            // Seed an existing mapping
            await testRegistryRepository.save(
                testRegistryRepository.create({ targetComponentId: 't1', testComponentId: 'c1' })
            );

            const dto = {
                mappings: [
                    { targetComponentId: 't1', testComponentId: 'c1' }, // Duplicate
                    { targetComponentId: 't2', testComponentId: 'c2' }  // New
                ]
            };

            const response = await request(app.getHttpServer())
                .post('/test-registry/import')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(dto)
                .expect(201);

            // Only the new mapping should be returned
            expect(response.body.length).toBe(1);
            expect(response.body[0].targetComponentId).toBe('t2');

            // The database should have exactly 2 records
            const count = await testRegistryRepository.count();
            expect(count).toBe(2);
        });
    });
});
