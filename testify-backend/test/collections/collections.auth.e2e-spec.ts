import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { CollectionType, CollectionStatus } from '../../src/collections/enums/collection.enums';
import { User } from '../../src/iam/users/entities/user.entity';
import { Role } from '../../src/iam/roles/entities/role.entity';


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
    });

    describe('Authentication logic', () => {
        it('should return 401 if token is missing when accessing collections', async () => {
            await request(app.getHttpServer())
                .post('/collections')
                .send({
                    name: 'Unauthorized Plan',
                    collectionType: CollectionType.TARGETS,
                    componentIds: [],
                })
                .expect(401);
        });

        it('should return 403 Forbidden if token lacks CREATE_COLLECTION permission', async () => {
            // Setup a user with minimal permissions
            const roleRepo = dataSource.getRepository(Role);
            const minimalRole = await roleRepo.save(
                roleRepo.create({
                    recordId: 'MINIMAL_ROLE',
                    name: 'Viewer',
                    permissions: [PERMISSIONS.DISCOVERY_VIEW], // Not enough
                }),
            );

            const userRepo = dataSource.getRepository(User);
            const minUser = await userRepo.save(
                userRepo.create({
                    recordId: 'MINIMAL_USER',
                    name: 'MinUser',
                    email: 'min@example.com',
                    firstName: 'Min',
                    lastName: 'User',
                    role: minimalRole,
                }),
            );

            const minToken = jwtService.sign({
                sub: minUser.recordId,
                email: minUser.email,
                tokenVersion: 0
            });

            await request(app.getHttpServer())
                .post('/collections')
                .set('Authorization', 'Bearer ' + minToken)
                .send({
                    name: 'Plan',
                    collectionType: CollectionType.TARGETS,
                    componentIds: [],
                })
                .expect(403);
        });
    });
});

