// backend/test/system-config/system-config.crud.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { SystemConfig } from '../../src/system/config/entities/system-config.entity';
import { User } from '../../src/iam/users/entities/user.entity';
import { Role } from '../../src/iam/roles/entities/role.entity';

describe('System Config CRUD (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let jwtService: JwtService;

    // Repositories
    let systemConfigRepository: Repository<SystemConfig>;
    let userRepository: Repository<User>;
    let roleRepository: Repository<Role>;

    // Personas
    let adminToken: string;
    let adminUser: User;
    let adminRole: Role;

    // Test Data
    let auditConfigKey = 'crud_audit_config';

    jest.setTimeout(60000);

    beforeAll(async () => {
        const setup = await setupTestApp();
        app = setup.app;
        dataSource = setup.dataSource;
        jwtService = setup.jwtService;

        systemConfigRepository = dataSource.getRepository(SystemConfig);
        userRepository = dataSource.getRepository(User);
        roleRepository = dataSource.getRepository(Role);

        // Create Admin Role
        adminRole = await roleRepository.save(roleRepository.create({
            recordId: 'SYS_CFG_ADMIN_ROLE',
            name: 'System Config Admin',
            permissions: [PERMISSIONS.SYSTEM_CONFIG_VIEW, PERMISSIONS.SYSTEM_CONFIG_EDIT],
        }));

        // Create Admin User
        adminUser = await userRepository.save(userRepository.create({
            recordId: 'SYS_CFG_ADMIN_USER',
            name: 'System Config Admin',
            firstName: 'Sys',
            lastName: 'Admin',
            email: 'sys.config.admin@test.com',
            role: adminRole,
        }));

        adminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });

        // Create Test Configs
        await systemConfigRepository.save([
            { key: auditConfigKey, value: { enabled: true, retentionDays: 90 }, description: 'Audit Settings' },
            { key: 'crud_theme_config', value: { primaryColor: 'blue' }, description: 'Theme Settings' },
        ]);
    });

    afterAll(async () => {
        await teardownTestApp({ app, dataSource });
    });

    describe('GET /system/config', () => {
        it('should return a list of all system configs', async () => {
            const res = await request(app.getHttpServer())
                .get('/system/config')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(2);

            const foundCallback = (c: SystemConfig) => c.key === auditConfigKey;
            const foundConfig = res.body.find(foundCallback);

            expect(foundConfig).toBeDefined();
            // Deep check value object
            expect(foundConfig.value).toEqual({ enabled: true, retentionDays: 90 });
        });
    });

    describe('GET /system/config/:key', () => {
        it('should return a specific system config by key', async () => {
            const res = await request(app.getHttpServer())
                .get(`/system/config/${auditConfigKey}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(res.body).toBeDefined();
            expect(res.body.key).toBe(auditConfigKey);
            expect(res.body.value).toEqual({ enabled: true, retentionDays: 90 });
        });

        it('should return value: null or empty object if config is missing (Service behavior dependent)', async () => {
            // Looking at the service logic in system-config.service.ts
            // async get(key: string): Promise<SystemConfig | null>
            // Controller returns the result directly.
            // NestJS returns 200 OK with empty body if return value is null.
            const res = await request(app.getHttpServer())
                .get('/system/config/non-existent-key')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(res.body).toEqual({});
        });
    });

    describe('PATCH /system/config/:key', () => {
        it("should update a system config's value", async () => {
            // Update Audit Config
            const updateDto = {
                value: { enabled: false, retentionDays: 30 }
            };

            const res = await request(app.getHttpServer())
                .patch(`/system/config/${auditConfigKey}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(200);

            // Based on simple success return usually
            // If controller returns void/success message
            // Let's assume it returns something.
            // Wait, previous test checked `res.body.success`.
            // Let's verify controller impl if possible, or just check entity.

            // Verify in DB
            const updatedConfig = await systemConfigRepository.findOneBy({ key: auditConfigKey });
            expect(updatedConfig).not.toBeNull();
            expect(updatedConfig!.value).toEqual(updateDto.value);
        });

        it("should create a new system config if key doesn't exist (upsert)", async () => {
            const newKey = 'new-feature-config';
            const updateDto = {
                value: { featureX: 'enabled' }
            };

            await request(app.getHttpServer())
                .patch(`/system/config/${newKey}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateDto)
                .expect(200);

            // Verify creation
            const newConfig = await systemConfigRepository.findOneBy({ key: newKey });
            expect(newConfig).toBeDefined();
            expect(newConfig!.value).toEqual(updateDto.value);
        });
    });
});
