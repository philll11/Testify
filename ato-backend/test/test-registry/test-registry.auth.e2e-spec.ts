import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { User } from '../../src/iam/users/entities/user.entity';
import { Role } from '../../src/iam/roles/entities/role.entity';

describe('TestRegistry Auth (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let jwtService: JwtService;
    let userRepository: Repository<User>;
    let roleRepository: Repository<Role>;

    jest.setTimeout(60000);

    beforeAll(async () => {
        const setup = await setupTestApp();
        app = setup.app;
        dataSource = setup.dataSource;
        jwtService = setup.jwtService;
        userRepository = dataSource.getRepository(User);
        roleRepository = dataSource.getRepository(Role);
    });

    afterAll(async () => {
        await teardownTestApp({ app, dataSource });
    });

    describe('Unauthenticated Access', () => {
        it('GET /test-registry - should deny access without token', async () => {
            await request(app.getHttpServer()).get('/test-registry').expect(401);
        });

        it('GET /test-registry/target/:id - should deny access without token', async () => {
            await request(app.getHttpServer())
                .get('/test-registry/target/00000000-0000-0000-0000-000000000000')
                .expect(401);
        });

        it('POST /test-registry - should deny access without token', async () => {
            await request(app.getHttpServer())
                .post('/test-registry')
                .send({ targetComponentId: '1', testComponentId: '2' })
                .expect(401);
        });

        it('DELETE /test-registry/:id - should deny access without token', async () => {
            await request(app.getHttpServer())
                .delete('/test-registry/00000000-0000-0000-0000-000000000000')
                .expect(401);
        });
    });

    describe('Unauthorized Access (Valid Token, Insufficient Permissions)', () => {
        let unprivilegedToken: string;
        let unprivilegedUser: User;
        let unprivilegedRole: Role;

        beforeAll(async () => {
            // Create role WITHOUT test registry permissions
            unprivilegedRole = roleRepository.create({
                recordId: 'UNPRIV_ROLE_REG',
                name: 'Unprivileged Role Reg',
                permissions: [],
            });
            await roleRepository.save(unprivilegedRole);

            // Create user WITHOUT test registry permissions
            unprivilegedUser = userRepository.create({
                recordId: 'UNPRIV_USER_REG',
                name: 'Unprivileged',
                firstName: 'Unpriv',
                lastName: 'User',
                email: 'unpriv.reg@test.com',
                role: unprivilegedRole
            });
            await userRepository.save(unprivilegedUser);

            unprivilegedToken = jwtService.sign({
                sub: unprivilegedUser.recordId,
                tokenVersion: 0,
            });
        });

        afterAll(async () => {
            await userRepository.remove(unprivilegedUser);
            await roleRepository.remove(unprivilegedRole);
        });

        it('GET /test-registry - should forbid access', async () => {
            await request(app.getHttpServer())
                .get('/test-registry')
                .set('Authorization', `Bearer ${unprivilegedToken}`)
                .expect(403);
        });

        it('POST /test-registry - should forbid access', async () => {
            await request(app.getHttpServer())
                .post('/test-registry')
                .set('Authorization', `Bearer ${unprivilegedToken}`)
                .send({ targetComponentId: '1', testComponentId: '2' })
                .expect(403);
        });

        it('DELETE /test-registry/:id - should forbid access', async () => {
            await request(app.getHttpServer())
                .delete('/test-registry/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${unprivilegedToken}`)
                .expect(403);
        });
    });
});