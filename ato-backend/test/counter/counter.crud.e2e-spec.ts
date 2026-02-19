// backend/test/counter/counter.crud.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { Counter } from '../../src/system/counters/entities/counter.entity';
import { User } from '../../src/iam/users/entities/user.entity';
import { Role } from '../../src/iam/roles/entities/role.entity';

describe('Counters CRUD (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let jwtService: JwtService;

    // Repositories
    let counterRepository: Repository<Counter>;
    let userRepository: Repository<User>;
    let roleRepository: Repository<Role>;

    // Personas
    let adminToken: string;
    let adminUser: User;
    let adminRole: Role;

    // Test Data
    let testCounterId = 'test_crud_counter';

    jest.setTimeout(60000);

    beforeAll(async () => {
        const setup = await setupTestApp();
        app = setup.app;
        dataSource = setup.dataSource;
        jwtService = setup.jwtService;

        counterRepository = dataSource.getRepository(Counter);
        userRepository = dataSource.getRepository(User);
        roleRepository = dataSource.getRepository(Role);

        // Create Admin Role
        adminRole = await roleRepository.save(roleRepository.create({
            recordId: 'COUNTER_ADMIN_ROLE',
            name: 'Counter Admin',
            permissions: [PERMISSIONS.COUNTERS_VIEW, PERMISSIONS.COUNTERS_EDIT],
        }));

        // Create Admin User
        adminUser = await userRepository.save(userRepository.create({
            recordId: 'COUNTER_ADMIN_USER',
            name: 'Counter Admin',
            firstName: 'Counter',
            lastName: 'Admin',
            email: 'counter.admin@test.com',
            role: adminRole,
        }));

        adminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });

        // Seed some counters
        await counterRepository.save([
            { _id: 'subsidiary', prefix: 'SUB', sequence_value: 10 },
            { _id: 'client', prefix: 'CLI', sequence_value: 5 },
            { _id: testCounterId, prefix: 'TST', sequence_value: 0 },
        ]);
    });

    afterAll(async () => {
        await teardownTestApp({ app, dataSource });
    });

    describe('GET /counters', () => {
        it('should return a list of all counters', async () => {
            const res = await request(app.getHttpServer())
                .get('/counters')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(3);
            const found = res.body.find((c: Counter) => c._id === 'subsidiary');
            expect(found).toBeDefined();
            expect(found.prefix).toBe('SUB');
        });
    });

    describe('PATCH /counters/:id', () => {
        it('should update a counter prefix', async () => {
            const updateDto = { prefix: 'NEW_TST' };

            const res = await request(app.getHttpServer())
                .patch(`/counters/${testCounterId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(200);

            expect(res.body._id).toBe(testCounterId);
            expect(res.body.prefix).toBe(updateDto.prefix);

            // Verify in DB
            const updated = await counterRepository.findOneBy({ _id: testCounterId });
            expect(updated?.prefix).toBe('NEW_TST');
        });

        it('should return 404 for non-existent counter', async () => {
            const updateDto = { prefix: 'FAIL' };
            await request(app.getHttpServer())
                .patch('/counters/nonexistent_counter')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(404);
        });

        describe('Validation', () => {
            // Restore prefix to valid state before these tests potentially pollute
            beforeEach(async () => {
                await counterRepository.update({ _id: testCounterId }, { prefix: 'TST' });
            });

            it('should return 400 for empty prefix', async () => {
                const updateDto = { prefix: '' };
                await request(app.getHttpServer())
                    .patch(`/counters/${testCounterId}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send(updateDto)
                    .expect(400);
            });

            it('should return 400 for prefix too long (>10 chars)', async () => {
                const updateDto = { prefix: 'THIS_IS_WAY_TOO_LONG' };
                await request(app.getHttpServer())
                    .patch(`/counters/${testCounterId}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send(updateDto)
                    .expect(400);
            });

            it('should return 400 for unexpected fields (whitelist)', async () => {
                const updateDto = { prefix: 'VALID', unexpectedField: 'foobar' };
                await request(app.getHttpServer())
                    .patch(`/counters/${testCounterId}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send(updateDto) // NestJS ValidationPipe with whitelist: true usually strips extra fields or throws 400 if forbidNonWhitelisted: true
                    .expect(400);
            });
        });
    });
});
