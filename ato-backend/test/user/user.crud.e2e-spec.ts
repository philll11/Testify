// backend/test/user/user.crud.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { User } from '../../src/iam/users/entities/user.entity';
import { Role } from '../../src/iam/roles/entities/role.entity';
import { CreateUserDto } from '../../src/iam/users/dto/create-user.dto';
import { UpdateUserDto } from '../../src/iam/users/dto/update-user.dto';

describe('Users CRUD (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let jwtService: JwtService;

    // Repositories
    let userRepository: Repository<User>;
    let roleRepository: Repository<Role>;

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

        userRepository = dataSource.getRepository(User);
        roleRepository = dataSource.getRepository(Role);

        // 1. Create GLOBAL_ADMIN
        const globalAdminRole = await roleRepository.save(roleRepository.create({
            recordId: 'GLOBAL_ADMIN_USER_CRUD',
            name: 'Global Admin User CRUD',
            permissions: Object.values(PERMISSIONS),
        }));

        globalAdmin = await userRepository.save(userRepository.create({
            recordId: 'ADMIN_USER_CRUD',
            name: 'Global Admin CRUD',
            firstName: 'Global',
            lastName: 'Admin',
            email: 'admin.crud@test.com',
            role: globalAdminRole,
        }));

        globalAdminToken = jwtService.sign({ sub: globalAdmin.recordId, tokenVersion: 0 });
    });

    afterAll(async () => {
        await teardownTestApp({ app, dataSource });
    });

    beforeEach(async () => {
        // Setup a standard role for testing
        // We'll just create a role with a distinct recordId or reuse.
        let role = await roleRepository.findOne({ where: { recordId: 'TEST_ROLE_USER_CRUD' } });
        if (!role) {
            role = await roleRepository.save(roleRepository.create({
                recordId: 'TEST_ROLE_USER_CRUD',
                name: 'Test Role User CRUD',
                permissions: [PERMISSIONS.USER_VIEW],
            }));
        }
        testRole = role;
    });

    describe('POST /users', () => {
        it('should create a new user successfully', async () => {
            // Ensure unique email
            const email = `new.user.${Date.now()}@test.com`;
            const newUserDto: CreateUserDto = {
                firstName: 'New',
                lastName: 'User',
                email: email,
                roleId: testRole.id,
            };

            const response = await request(app.getHttpServer())
                .post('/users')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(newUserDto)
                .expect(201);

            expect(response.body).toMatchObject({
                firstName: newUserDto.firstName,
                lastName: newUserDto.lastName,
                email: newUserDto.email,
                isActive: true,
                isDeleted: false,
            });
            expect(response.body.recordId).toMatch(/^USR\d+$/);
        });

        it('should fail if email is duplicate', async () => {
            const email = `duplicate.${Date.now()}@test.com`;
            // First create a user
            await userRepository.save(userRepository.create({
                recordId: `DUP_${Date.now()}`,
                name: 'Duplicate Email User',
                firstName: 'Duplicate',
                lastName: 'User',
                email: email,
                role: testRole,
            }));

            const duplicateDto: CreateUserDto = {
                firstName: 'Another',
                lastName: 'User',
                email: email,
                roleId: testRole.id,
            };

            await request(app.getHttpServer())
                .post('/users')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(duplicateDto)
                .expect(409);
        });

        it('should fail if required fields are missing', async () => {
            const invalidDto = {
                firstName: 'Missing',
                // lastName missing
                // email missing
            };

            await request(app.getHttpServer())
                .post('/users')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(invalidDto)
                .expect(400);
        });
    });

    describe('GET /users', () => {
        it('should return a list of users', async () => {
            const response = await request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            response.body.forEach((user: User) => {
                expect(user.isActive).toBe(true);
                expect(user.isDeleted).toBe(false);
            });
        });

        it('should not return deleted or inactive users by default', async () => {
            const deletedUser = await userRepository.save(userRepository.create({
                recordId: `DEL_USER_${Date.now()}`,
                name: 'Deleted User',
                firstName: 'Del',
                lastName: 'User',
                email: `del.user.${Date.now()}@test.com`,
                role: testRole,
                isDeleted: true
            }));

            const inactiveUser = await userRepository.save(userRepository.create({
                recordId: `INACTIVE_USER_${Date.now()}`,
                name: 'Inactive User',
                firstName: 'Inactive',
                lastName: 'User',
                email: `inactive.user.${Date.now()}@test.com`,
                role: testRole,
                isActive: false
            }));

            const response = await request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            const userIds = response.body.map((u: User) => u.id);
            expect(userIds).not.toContain(deletedUser.id);
            expect(userIds).not.toContain(inactiveUser.id);
        });
    });

    describe('GET /users/:id', () => {
        it('should return a single user by ID', async () => {
            const response = await request(app.getHttpServer())
                .get(`/users/${globalAdmin.id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            expect(response.body.id).toBe(globalAdmin.id);
            expect(response.body.email).toBe(globalAdmin.email);
            expect(response.body.isActive).toBe(true);
            expect(response.body.isDeleted).toBe(false);
        });

        it('should return 404 if user is deleted', async () => {
            const deletedUser = await userRepository.save(userRepository.create({
                recordId: `DEL_USER_ID_${Date.now()}`,
                name: 'Deleted User By Id',
                firstName: 'Del',
                lastName: 'Id',
                email: `del.id.${Date.now()}@test.com`,
                role: testRole,
                isDeleted: true
            }));

            await request(app.getHttpServer())
                .get(`/users/${deletedUser.id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(404);
        });

        it('should return 404 if user is inactive', async () => {
            const inactiveUser = await userRepository.save(userRepository.create({
                recordId: `INACTIVE_USER_ID_${Date.now()}`,
                name: 'Inactive User By Id',
                firstName: 'Inact',
                lastName: 'Id',
                email: `inactive.id.${Date.now()}@test.com`,
                role: testRole,
                isActive: false
            }));

            await request(app.getHttpServer())
                .get(`/users/${inactiveUser.id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(404);
        });
    });

    describe('PATCH /users/:id', () => {
        let userToUpdate: User;

        beforeEach(async () => {
            userToUpdate = await userRepository.save(userRepository.create({
                recordId: `UPD_${Date.now()}`,
                name: 'Update Me',
                firstName: 'Update',
                lastName: 'Me',
                email: `update.me.${Date.now()}@test.com`,
                role: testRole,
            }));
        });

        it('should update user details successfully', async () => {
            const updateDto: UpdateUserDto = {
                firstName: 'Updated',
                lastName: 'Name',
            };

            const response = await request(app.getHttpServer())
                .patch(`/users/${userToUpdate.id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateDto)
                .expect(200);

            expect(response.body.firstName).toBe(updateDto.firstName);
            expect(response.body.lastName).toBe(updateDto.lastName);
        });
    });

    describe('DELETE /users/:id', () => {
        let userToDelete: User;

        beforeEach(async () => {
            userToDelete = await userRepository.save(userRepository.create({
                recordId: `DEL_${Date.now()}`,
                name: 'Delete Me',
                firstName: 'Delete',
                lastName: 'Me',
                email: `delete.me.${Date.now()}@test.com`,
                role: testRole,
            }));
        });

        it('should soft delete a user', async () => {
            await request(app.getHttpServer())
                .delete(`/users/${userToDelete.id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(200);

            // Verify soft delete in DB
            const deletedUser = await userRepository.findOne({
                where: { id: userToDelete.id },
                withDeleted: true // TypeORM specific option for soft-delete if enabled, otherwise check property manually
            });
            // If @DeleteDateColumn is used, typeorm filters it out by default.
            // If explicit isDeleted boolean is used, we check that.
            // Our User entity has `isDeleted: boolean`.
            expect(deletedUser).toBeDefined();
            expect(deletedUser!.isDeleted).toBe(true);
        });
    });
});
