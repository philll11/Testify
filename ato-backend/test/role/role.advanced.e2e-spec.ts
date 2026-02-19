// backend/test/role/role.advanced.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { Role } from '../../src/iam/roles/entities/role.entity';
import { User } from '../../src/iam/users/entities/user.entity';

describe('Roles Advanced (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let jwtService: JwtService;

    // Repositories
    let roleRepository: Repository<Role>;
    let userRepository: Repository<User>;

    // Personas
    let globalAdminToken: string;

    // Test Entities
    let roleInUse: Role;
    let userWithRole: User;

    jest.setTimeout(60000);

    beforeAll(async () => {
        const setup = await setupTestApp();
        app = setup.app;
        dataSource = setup.dataSource;
        jwtService = setup.jwtService;

        roleRepository = dataSource.getRepository(Role);
        userRepository = dataSource.getRepository(User);

        // 1. Create GLOBAL_ADMIN for Auth
        const globalAdminRole = await roleRepository.save(roleRepository.create({
            recordId: 'GLOBAL_ADMIN_ADVANCED',
            name: 'Global Admin Advanced',
            permissions: Object.values(PERMISSIONS),
        }));

        const globalAdmin = await userRepository.save(userRepository.create({
            recordId: 'ADMIN_USER_ADVANCED',
            name: 'Global Admin Advanced',
            firstName: 'Global',
            lastName: 'Admin',
            email: 'global.admin.advanced@test.com',
            role: globalAdminRole,
        }));

        globalAdminToken = jwtService.sign({ sub: globalAdmin.recordId, tokenVersion: 0 });

        // 2. Create a Role that will be IN USE
        roleInUse = await roleRepository.save(roleRepository.create({
            recordId: 'ROLE_IN_USE',
            name: 'Role In Use',
            permissions: [PERMISSIONS.USER_VIEW],
        }));

        // 3. Create a User assigned to that Role
        userWithRole = await userRepository.save(userRepository.create({
            recordId: 'USER_WITH_ROLE',
            name: 'User With Role',
            firstName: 'User',
            lastName: 'WithRole',
            email: 'user.with.role@test.com',
            role: roleInUse,
        }));
    });

    afterAll(async () => {
        await teardownTestApp({ app, dataSource });
    });

    describe('DELETE /roles/:id', () => {
        it('should return 409 when trying to delete a role that is in use', async () => {
            const response = await request(app.getHttpServer())
                .delete(`/roles/${roleInUse.id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .expect(409);

            expect(response.body.message).toContain('Cannot delete Role. Assigned to one or more Users.');
        });
    });

    describe('PATCH /roles/:id', () => {
        it('should return 409 when trying to deactivate a role that is in use', async () => {
            const updateDto = {
                isActive: false,
            };

            const response = await request(app.getHttpServer())
                .patch(`/roles/${roleInUse.id}`)
                .set('Authorization', `Bearer ${globalAdminToken}`)
                .send(updateDto)
                .expect(409);

            expect(response.body.message).toContain('This role cannot be deactivated because it has 1 active user(s) assigned to it.');
        });
    });
});