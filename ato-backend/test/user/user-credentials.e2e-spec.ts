// backend/test/user/user-credentials.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { User } from '../../src/iam/users/entities/user.entity';
import { Role } from '../../src/iam/roles/entities/role.entity';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { CreateCredentialDto } from '../../src/iam/users/dto/create-credential.dto';

describe('User Credentials (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let jwtService: JwtService;

    let userRepository: Repository<User>;
    let roleRepository: Repository<Role>;

    let userA: User;
    let tokenA: string;

    let userB: User;
    let tokenB: string;

    let credentialId: string;

    beforeAll(async () => {
        const setup = await setupTestApp();
        app = setup.app;
        dataSource = setup.dataSource;
        jwtService = setup.jwtService;

        userRepository = dataSource.getRepository(User);
        roleRepository = dataSource.getRepository(Role);

        // Setup Role
        const role = await roleRepository.save(roleRepository.create({
            recordId: 'USER_CREDS_ROLE',
            name: 'User Creds Role',
            permissions: [PERMISSIONS.USER_VIEW], // Minimal permission
        }));

        // Setup User A
        userA = await userRepository.save(userRepository.create({
            recordId: 'USER_A',
            name: 'User A',
            firstName: 'User',
            lastName: 'A',
            email: 'user.a@test.com',
            role: role,
        }));
        tokenA = jwtService.sign({ sub: userA.recordId, tokenVersion: 0 });

        // Setup User B (for isolation test)
        userB = await userRepository.save(userRepository.create({
            recordId: 'USER_B',
            name: 'User B',
            firstName: 'User',
            lastName: 'B',
            email: 'user.b@test.com',
            role: role,
        }));
        tokenB = jwtService.sign({ sub: userB.recordId, tokenVersion: 0 });
    });

    afterAll(async () => {
        await teardownTestApp({ app, dataSource });
    });

    describe('POST /users/me/credentials', () => {
        it('should create a new credential successfully', async () => {
            const dto: CreateCredentialDto = {
                platform: 'Boomi',
                profileName: 'Prod-Boomi-A',
                accountId: 'boomi-account-123',
                username: 'api-user',
                passwordOrToken: 'super-secret-token',
                executionInstanceId: 'atom-001',
            };

            const response = await request(app.getHttpServer())
                .post('/users/me/credentials')
                .set('Authorization', `Bearer ${tokenA}`)
                .send(dto)
                .expect(201);

            expect(response.body).toEqual(expect.objectContaining({
                id: expect.any(String),
                platform: dto.platform,
                profileName: dto.profileName,
                accountId: dto.accountId,
                username: dto.username,
                executionInstanceId: dto.executionInstanceId,
            }));

            // Captuer ID for later use
            credentialId = response.body.id;

            // Password should NOT be in the response
            expect(response.body).not.toHaveProperty('passwordOrToken');
        });
    });

    describe('GET /users/me/credentials', () => {
        it('should list decrypted credentials for the current user', async () => {
            const response = await request(app.getHttpServer())
                .get('/users/me/credentials')
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(200);

            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBeGreaterThanOrEqual(1);

            const credential = response.body.find((c: any) => c.profileName === 'Prod-Boomi-A');
            expect(credential).toBeDefined();

            // Verify decryption worked correctly
            expect(credential.accountId).toBe('boomi-account-123');
            expect(credential.username).toBe('api-user');
            expect(credential.executionInstanceId).toBe('atom-001');
            // Password should NOT be returned
            expect(credential.passwordOrToken).toBeUndefined();
        });

        it('should NOT return credentials for other users (Isolation)', async () => {
            // User B requests their credentials
            const response = await request(app.getHttpServer())
                .get('/users/me/credentials')
                .set('Authorization', `Bearer ${tokenB}`) // User B
                .expect(200);

            // Should be empty or at least not contain User A's credential
            const userACreds = response.body.find((c: any) => c.profileName === 'Prod-Boomi-A');
            expect(userACreds).toBeUndefined();
        });
    });

    describe('DELETE /users/me/credentials/:id', () => {
        it('should delete the credential', async () => {
            await request(app.getHttpServer())
                .delete(`/users/me/credentials/${credentialId}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(200);
        });

        it('should return 404/Empty when trying to find deleted credential', async () => {
            const response = await request(app.getHttpServer())
                .get('/users/me/credentials')
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(200);

            const cred = response.body.find((c: any) => c.id === credentialId);
            expect(cred).toBeUndefined();
        });
    });
});
