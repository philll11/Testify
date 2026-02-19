// backend/test/role/role.crud.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { Role } from '../../src/iam/roles/entities/role.entity';
import { User } from '../../src/iam/users/entities/user.entity';

describe('Roles CRUD (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let jwtService: JwtService;

    // Repositories
    let roleRepository: Repository<Role>;
    let userRepository: Repository<User>;

    // Personas
    let globalAdminToken: string;
    let globalAdmin: User;

    // Test Entities
    let testRole: Role;

    jest.setTimeout(60000);

    beforeAll(async () => {
        const setup = await setupTestApp();
        app = setup.app;
        dataSource = setup.dataSource;
        jwtService = setup.jwtService;

        roleRepository = dataSource.getRepository(Role);
        userRepository = dataSource.getRepository(User);

        // Create a single admin role with all permissions for testing
        const globalAdminRole = await roleRepository.save(roleRepository.create({
            recordId: 'GLOBAL_ADMIN_CRUD',
            name: 'Platform Administrator',
            permissions: Object.values(PERMISSIONS),
        }));

        // Create a single admin user
        globalAdmin = await userRepository.save(userRepository.create({
            recordId: 'ADMIN_USER_CRUD',
            name: 'Global Admin',
            firstName: 'Global',
            lastName: 'Admin',
            email: 'global.admin.crud@test.com',
            role: globalAdminRole,
        }));

        globalAdminToken = jwtService.sign({ sub: globalAdmin.recordId, tokenVersion: 0 });
    });

    afterAll(async () => {
        await teardownTestApp({ app, dataSource });
    });

    beforeEach(async () => {
        // Clean up and create test role
        await roleRepository.delete({ recordId: 'TEST_ROLE_CRUD' });

        testRole = await roleRepository.save(roleRepository.create({
            recordId: 'TEST_ROLE_CRUD',
            name: 'Test Role',
            description: 'A role for testing PATCH and DELETE',
            permissions: [PERMISSIONS.USER_VIEW],
        }));
    });

    describe('POST /roles', () => {
        it('should create a new role successfully', async () => {
            // Cleanup in case previous run failed
            await roleRepository.delete({ name: 'New Test Manager' });

            const newRoleDto = {
                name: 'New Test Manager',
                description: 'Manages test execution plans',
                permissions: [PERMISSIONS.USER_VIEW, PERMISSIONS.USER_EDIT],
            };

            const response = await request(app.getHttpServer())
                .post('/roles')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(newRoleDto)
                .expect(201);

            expect(response.body).toMatchObject({
                ...newRoleDto,
                isActive: true,
                isDeleted: false,
            });
            expect(response.body.recordId).toMatch(/^ROL\d+$/);
            expect(response.body.id).toBeDefined();
        });

        describe('Validation', () => {
            it('should fail if name is missing', async () => {
                const newRoleDto = {
                    description: 'Missing name',
                    permissions: [PERMISSIONS.USER_VIEW],
                };
                await request(app.getHttpServer())
                    .post('/roles')
                    .set('Authorization', `Bearer ${globalAdminToken}`)
                    .send(newRoleDto)
                    .expect(400);
            });
        });
    });

    describe('GET /roles', () => {
        it('should return a list of roles', async () => {
            const response = await request(app.getHttpServer())
                .get('/roles')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            response.body.forEach((role: Role) => {
                expect(role.isActive).toBe(true);
                expect(role.isDeleted).toBe(false);
            });
        });

        it('should not return deleted or inactive roles by default', async () => {
            // Create deleted role
            const deletedRole = await roleRepository.save(roleRepository.create({
                recordId: 'DEL_ROLE_TEST',
                name: 'Deleted Role Test',
                permissions: [],
                isDeleted: true
            }));

            // Create inactive role
            const inactiveRole = await roleRepository.save(roleRepository.create({
                recordId: 'INACTIVE_ROLE_TEST',
                name: 'Inactive Role Test',
                permissions: [],
                isActive: false
            }));

            const response = await request(app.getHttpServer())
                .get('/roles')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            const recordIds = response.body.map((r: Role) => r.recordId);
            expect(recordIds).not.toContain(deletedRole.recordId);
            expect(recordIds).not.toContain(inactiveRole.recordId);
        });
    });

    describe('GET /roles/:roleId', () => {
        it('should return a single role by recordId or ID', async () => {
            // Using UUID logic if implementation supports it, otherwise rely on ID from testRole
            const response = await request(app.getHttpServer())
                .get(`/roles/${testRole.id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            expect(response.body.id).toBe(testRole.id);
            expect(response.body.name).toBe(testRole.name);
            expect(response.body.isActive).toBe(true);
            expect(response.body.isDeleted).toBe(false);
        });

        it('should return 404 if role is deleted', async () => {
            const deletedRole = await roleRepository.save(roleRepository.create({
                recordId: 'DEL_ROLE_BY_ID',
                name: 'Deleted Role By Id',
                permissions: [],
                isDeleted: true
            }));

            await request(app.getHttpServer())
                .get(`/roles/${deletedRole.id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(404);
        });

        it('should return 404 if role is inactive', async () => {
            const inactiveRole = await roleRepository.save(roleRepository.create({
                recordId: 'INACTIVE_ROLE_BY_ID',
                name: 'Inactive Role By Id',
                permissions: [],
                isActive: false
            }));

            await request(app.getHttpServer())
                .get(`/roles/${inactiveRole.id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(404);
        });
    });

    describe('PATCH /roles/:roleId', () => {
        it('should update a role', async () => {
            const updateDto = {
                name: 'Updated Role Name',
            };

            const response = await request(app.getHttpServer())
                .patch(`/roles/${testRole.id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateDto)
                .expect(200);

            expect(response.body.name).toBe(updateDto.name);
        });
    });

    describe('DELETE /roles/:roleId', () => {
        it('should soft delete a role', async () => {
            await request(app.getHttpServer())
                .delete(`/roles/${testRole.id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            // Verify it's not returned in default find or check deleted status
            // Depending on implementation, soft delete might mean it is still in DB
        });
    });
});
