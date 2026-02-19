// backend/test/user/user.advanced.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { Role } from '../../src/iam/roles/entities/role.entity';
import { User } from '../../src/iam/users/entities/user.entity';

describe('Users Advanced Logic (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let jwtService: JwtService;

    // Repositories
    let roleRepository: Repository<Role>;
    let userRepository: Repository<User>;

    // Personas
    let adminToken: string;
    let standardUserToken: string;

    // Entities
    let adminRole: Role;
    let standardRole: Role;
    let standardUser: User;

    jest.setTimeout(60000);

    beforeAll(async () => {
        const setup = await setupTestApp();
        app = setup.app;
        dataSource = setup.dataSource;
        jwtService = setup.jwtService;

        roleRepository = dataSource.getRepository(Role);
        userRepository = dataSource.getRepository(User);

        // 1. Setup Admin Role & User
        adminRole = await roleRepository.save(roleRepository.create({
            recordId: 'ADM_ADVANCED',
            name: 'Advanced Admin',
            permissions: Object.values(PERMISSIONS),
        }));

        const adminUser = await userRepository.save(userRepository.create({
            recordId: 'ADM_USR_ADV',
            name: 'Admin User',
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin.adv@test.com',
            role: adminRole,
        }));
        adminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });

        // 2. Setup Standard Role (No global edit permissions)
        standardRole = await roleRepository.save(roleRepository.create({
            recordId: 'STD_ADVANCED',
            name: 'Standard Role',
            permissions: [], // No permissions
        }));
    });

    afterAll(async () => {
        await teardownTestApp({ app, dataSource });
    });

    beforeEach(async () => {
        // Cleanup and recreate standard user for isolation
        const existing = await userRepository.findOne({ where: { recordId: 'STD_USR_ADV' } });
        if (existing) await userRepository.remove(existing);

        standardUser = await userRepository.save(userRepository.create({
            recordId: 'STD_USR_ADV',
            name: 'Standard User',
            firstName: 'Standard',
            lastName: 'User',
            email: 'standard.adv@test.com',
            role: standardRole,
            preferences: { theme: 'light' }
        }));
        standardUserToken = jwtService.sign({ sub: standardUser.recordId, tokenVersion: 0 });
    });

    describe('Self-Modification Integrity', () => {
        it('should allow user to update their own allowed fields (firstName, lastName)', async () => {
            const updateDto = {
                firstName: 'Changed',
                lastName: 'Self',
            };

            const response = await request(app.getHttpServer())
                .patch(`/users/${standardUser.id}`)
                .set('Authorization', `Bearer ${standardUserToken}`)
                .send(updateDto)
                .expect(200);

            expect(response.body.firstName).toBe('Changed');
            expect(response.body.lastName).toBe('Self');
        });

        it('should allow user to update their own preferences', async () => {
            const updateDto = {
                preferences: { theme: 'dark' },
            };

            const response = await request(app.getHttpServer())
                .patch(`/users/${standardUser.id}`)
                .set('Authorization', `Bearer ${standardUserToken}`)
                .send(updateDto)
                .expect(200);

            expect(response.body.preferences.theme).toBe('dark');
        });

        it('should DENY user from updating unauthorized fields (Privilege Escalation)', async () => {
            // Attempt to assign self directly to Admin Role - this fails validation in Service due to whitelisted fields
            // "Unauthorized fields: roleId"
            const updateDto = {
                roleId: adminRole.id,
            };

            await request(app.getHttpServer())
                .patch(`/users/${standardUser.id}`)
                .set('Authorization', `Bearer ${standardUserToken}`)
                .send(updateDto)
                .expect(403);

            // Verify DB not changed
            const freshUser = await userRepository.findOne({ where: { id: standardUser.id }, relations: ['role'] });
            expect(freshUser!.role.id).toBe(standardRole.id);
        });

        it('should DENY user updating their own isActive status', async () => {
            // "Unauthorized fields: isActive"
            const updateDto = {
                isActive: false,
            };

            await request(app.getHttpServer())
                .patch(`/users/${standardUser.id}`)
                .set('Authorization', `Bearer ${standardUserToken}`)
                .send(updateDto)
                .expect(403);
        });
    });

    describe('Foreign Key Integrity', () => {
        it('should fail when assigning a non-existent role', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000'; // Valid UUID format but likely not in DB

            // Admin tries to set invalid role
            await request(app.getHttpServer())
                .patch(`/users/${standardUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ roleId: nonExistentId })
                .expect(400); // Controller/Validation catches invalid format or TypeORM foreign key constraint (if handled nicely)
        });
    });

    describe('Immutable Fields', () => {
        it('should ignore attempts to change recordId via PATCH', async () => {
            // Even an Admin shouldn't be able to change recordId usually, 
            // but DTO stripping usually handles this silently.
            // If DTO whitelist forbids unknown, it returns 400.

            await request(app.getHttpServer())
                .patch(`/users/${standardUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ recordId: 'NEW_RECORD_ID' })
                .expect(400);
        });
    });
});
