import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { User } from '../../src/iam/users/entities/user.entity';
import { Role } from '../../src/iam/roles/entities/role.entity';
import { TestRegistry } from '../../src/test-registry/entities/test-registry.entity';

describe('TestRegistry Advanced (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let jwtService: JwtService;

    let userRepository: Repository<User>;
    let roleRepository: Repository<Role>;
    let testRegistryRepository: Repository<TestRegistry>;

    let adminToken: string;

    jest.setTimeout(60000);

    beforeAll(async () => {
        const setup = await setupTestApp();
        app = setup.app;
        dataSource = setup.dataSource;
        jwtService = setup.jwtService;

        userRepository = dataSource.getRepository(User);
        roleRepository = dataSource.getRepository(Role);
        testRegistryRepository = dataSource.getRepository(TestRegistry);

        const adminRole = await roleRepository.save(
            roleRepository.create({
                recordId: 'ADMIN_ROLE_REG_ADV',
                name: 'Admin Role Reg Adv',
                permissions: Object.values(PERMISSIONS),
            }),
        );

        const adminUser = await userRepository.save(
            userRepository.create({
                recordId: 'ADMIN_REG_ADV',
                name: 'Admin User',
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin.reg.adv@test.com',
                role: adminRole,
            }),
        );

        adminToken = jwtService.sign({
            sub: adminUser.recordId,
            tokenVersion: 0,
        });
    });

    afterAll(async () => {
        await teardownTestApp({ app, dataSource });
    });

    beforeEach(async () => {
        await testRegistryRepository.clear();
    });

    describe('Import Mappings Edge Cases', () => {
        it('should ignore duplicate import mappings and only create net-new', async () => {
            // Create first mapping
            await testRegistryRepository.save(
                testRegistryRepository.create({
                    targetComponentId: 'dupe-target',
                    testComponentId: 'dupe-test',
                })
            );

            const importDto = {
                mappings: [
                    // This one is duplicate
                    { targetComponentId: 'dupe-target', testComponentId: 'dupe-test' },
                    // This one is new
                    { targetComponentId: 'new-target', testComponentId: 'new-test' }
                ]
            };

            const response = await request(app.getHttpServer())
                .post('/test-registry/import')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(importDto)
                .expect(201);

            // Only the new mapping should be returned
            expect(response.body.length).toBe(1);
            expect(response.body[0].targetComponentId).toBe('new-target');

            // But both should exist in DB
            const all = await testRegistryRepository.find();
            expect(all.length).toBe(2);
        });

        it('should reject import if mappings array is empty', async () => {
            await request(app.getHttpServer())
                .post('/test-registry/import')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ mappings: [] })
                .expect(400); // Bad Request from class-validator
        });

        it('should reject import if mappings array missing entirely', async () => {
            await request(app.getHttpServer())
                .post('/test-registry/import')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({})
                .expect(400); // Bad Request from class-validator
        });
    });
});