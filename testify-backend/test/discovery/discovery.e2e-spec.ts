import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { setupTestApp, teardownTestApp } from '../test-utils';
import { User } from '../../src/iam/users/entities/user.entity';
import { Role } from '../../src/iam/roles/entities/role.entity';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { DiscoveredComponent } from '../../src/discovery/entities/discovered-component.entity';
import { IntegrationPlatform } from '../../src/integration/constants/integration-platform.enum';
import { IntegrationService } from '../../src/integration/integration.service';
import { DiscoveryService } from '../../src/discovery/discovery.service';
import { DiscoveryScheduler } from '../../src/discovery/discovery.scheduler';
import { PlatformProfileService } from '../../src/integration/platform-profile/platform-profile.service';
import { PlatformEnvironmentService } from '../../src/integration/platform-environment/platform-environment.service';
import { SystemConfigService } from '../../src/system/config/system-config.service';
import { SystemConfigKeys } from '../../src/common/constants/system-config.constants';
import { IIntegrationPlatformService } from '../../src/integration/interfaces/integration-platform.interface';

describe('Discovery Module E2E', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let jwtService: JwtService;

    let userRepository: Repository<User>;
    let roleRepository: Repository<Role>;
    let discoveredComponentRepository: Repository<DiscoveredComponent>;

    let profileService: PlatformProfileService;
    let environmentService: PlatformEnvironmentService;
    let systemConfigService: SystemConfigService;
    let integrationService: IntegrationService;
    let backgroundTasksQueue: Queue;
    let discoveryService: DiscoveryService;
    let discoveryScheduler: DiscoveryScheduler;

    let adminToken: string;
    let profileId: string;
    let environmentId: string;

    beforeAll(async () => {
        const setup = await setupTestApp();
        app = setup.app;
        dataSource = setup.dataSource;
        jwtService = setup.jwtService;

        userRepository = dataSource.getRepository(User);
        roleRepository = dataSource.getRepository(Role);
        discoveredComponentRepository = dataSource.getRepository(DiscoveredComponent);

        profileService = app.get(PlatformProfileService);
        environmentService = app.get(PlatformEnvironmentService);
        systemConfigService = app.get(SystemConfigService);
        integrationService = app.get(IntegrationService);
        backgroundTasksQueue = app.get<Queue>(getQueueToken('background-tasks'));
        discoveryService = app.get(DiscoveryService);
        discoveryScheduler = app.get(DiscoveryScheduler);

        // Create Admin Role & User
        let adminRole = await roleRepository.findOne({ where: { recordId: 'ROLE_SYNC_ADMIN' } });
        if (!adminRole) {
            adminRole = await roleRepository.save(
                roleRepository.create({
                    recordId: 'ROLE_SYNC_ADMIN',
                    name: 'Sync Admin',
                    permissions: [PERMISSIONS.DISCOVERY_SYNC, PERMISSIONS.DISCOVERY_VIEW, PERMISSIONS.SYSTEM_CONFIG_EDIT, PERMISSIONS.SYSTEM_CONFIG_VIEW],
                }),
            );
        }

        let adminUser = await userRepository.findOne({ where: { recordId: 'USER_SYNC_ADMIN' } });
        if (!adminUser) {
            adminUser = await userRepository.save(
                userRepository.create({
                    recordId: 'USER_SYNC_ADMIN',
                    firstName: 'Sync',
                    lastName: 'Admin',
                    name: 'Sync Admin',
                    email: 'sync.admin@example.com',
                    isActive: true,
                    role: adminRole,
                }),
            );
        }

        adminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });

        // Seed Profile
        try {
            const profile = await profileService.create({
                name: 'E2E Boomi Profile',
                accountId: 'boomi-test-account',
                platformType: IntegrationPlatform.BOOMI,
                description: 'Profile for syncing',
                config: { pollInterval: 50 },
            });
            profileId = profile.id;
        } catch (error: any) {
            const profiles = await profileService.findAll();
            const existingProfile = profiles.find(p => p.name === 'E2E Boomi Profile');
            if (!existingProfile) throw error;
            profileId = existingProfile.id;
        }

        // Seed Environment
        try {
            const environment = await environmentService.create({
                name: 'E2E Sync Env',
                description: 'Env for syncing',
                profileId: profileId,
                isDefault: true,
                credentials: {
                    username: 'test-user',
                    passwordOrToken: 'secret',
                    executionInstanceId: 'atom-id-1',
                },
            });
            environmentId = environment.id;
        } catch (error: any) {
            const envs = await environmentService.findAll();
            const existingEnv = envs.find(e => e.name === 'E2E Sync Env');
            if (!existingEnv) throw error;
            environmentId = existingEnv.id;
        }

        // Set Discovery Config
        await systemConfigService.set(SystemConfigKeys.DISCOVERY.CONFIG, {
            componentTypes: ['process', 'transform.map'],
            testDirectoryFolderName: 'test_folder',
            defaultSyncEnvironmentId: environmentId,
            syncScheduleCron: '0 * * * * *',
            isSyncActive: true,
        });
    });

    afterAll(async () => {
        await teardownTestApp({ app, dataSource });
    });

    afterEach(async () => {
        jest.clearAllMocks();
        try {
            await backgroundTasksQueue.drain();
            const jobs = await backgroundTasksQueue.getJobs(['delayed', 'waiting', 'active', 'completed', 'failed']);
            for (const job of jobs) {
                await job.remove();
            }
        } catch (e) { }
    });

    it('should successfully sync components and persist them locally (POST /system/sync)', async () => {
        // 1. Mock the IntegrationPlatformService adapter
        const mockPlatformService: Partial<IIntegrationPlatformService> = {
            searchComponents: jest.fn().mockImplementation(async function* () {
                yield [
                    { id: 'comp-1', name: 'Test Process 1', type: 'process', folderId: 'folder-1' },
                    { id: 'comp-2', name: 'Standard Map', type: 'transform.map', folderId: 'folder-2' },
                    { id: 'comp-3', name: 'Prod Process', type: 'process', folderId: 'folder-2' },
                ];
            }),
            resolveFolderPath: jest.fn().mockImplementation((folderId: string) => {
                if (folderId === 'folder-1') return Promise.resolve('/Root/Test_Folder');
                if (folderId === 'folder-2') return Promise.resolve('/Root/Production');
                return Promise.resolve('/');
            }),
        };

        // Spy on getServiceById to return our mock
        jest.spyOn(integrationService, 'getServiceById').mockResolvedValue(mockPlatformService as IIntegrationPlatformService);

        // 2. Execute via REST endpoint
        const response = await request(app.getHttpServer())
            .post('/system/sync')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(202);

        // 3. Verify response
        expect(['Synchronization job enqueued successfully', 'Synchronization is already active']).toContain(response.body.message);
        if (response.body.data) { expect(response.body.data.jobId).toEqual(expect.any(String)); }

        // 4. Manually trigger sync to verify logic
        const result = await discoveryService.syncDatabase();
        expect(result.upserted).toBe(3);

        // 5. Verify DB State & Test Logic Evaluation
        const dbComponents = await discoveredComponentRepository.find({ order: { name: 'ASC' } });
        expect(dbComponents).toHaveLength(3);

        const testProcess = dbComponents.find((c) => c.componentId === 'comp-1');
        expect(testProcess?.isTest).toBe(true); // Should be true because folder path contains 'test_folder' and type is 'process'
        expect(testProcess?.folderPath).toBe('/Root/Test_Folder');

        const standardMap = dbComponents.find((c) => c.componentId === 'comp-2');
        expect(standardMap?.isTest).toBe(false); // Type is 'transform.map', so not a test

        const prodProcess = dbComponents.find((c) => c.componentId === 'comp-3');
        expect(prodProcess?.isTest).toBe(false); // Type 'process', but folder path doesn't contain test string
    });

    it('should prune localized components that are removed from the external platform', async () => {
        // 1. Mock the adapter returning ONLY one component (comp-1) this time
        const mockPlatformService: Partial<IIntegrationPlatformService> = {
            searchComponents: jest.fn().mockImplementation(async function* () {
                yield [
                    { id: 'comp-1', name: 'Test Process 1 Renamed', type: 'process', folderId: 'folder-1' },
                ];
            }),
            resolveFolderPath: jest.fn().mockResolvedValue('/Root/Test_Folder'),
        };

        jest.spyOn(integrationService, 'getServiceById').mockResolvedValue(mockPlatformService as IIntegrationPlatformService);

        // 2. Pre-verify we have 3 components in the DB from the last test
        const preSyncCount = await discoveredComponentRepository.count();
        expect(preSyncCount).toBe(3);

        // 3. Manually trigger sync to verify logic
        const result = await discoveryService.syncDatabase();
        expect(result.upserted).toBe(1);
        expect(result.deleted).toBe(2);

        // 5. DB should only have the 1 remaining component, and it should be updated

        const postSyncComponents = await discoveredComponentRepository.find();
        expect(postSyncComponents).toHaveLength(1);
        expect(postSyncComponents[0].componentId).toBe('comp-1');
        expect(postSyncComponents[0].name).toBe('Test Process 1 Renamed'); // Verifies upsert behavior
    });

    it('should ignore manual sync if componentTypes array is empty (negative test)', async () => {
        // Update config to have empty componentTypes
        await systemConfigService.set(SystemConfigKeys.DISCOVERY.CONFIG, {
            componentTypes: [],
            testDirectoryFolderName: 'test_folder',
            defaultSyncEnvironmentId: environmentId,
            syncScheduleCron: '0 * * * * *',
            isSyncActive: true,
        });

        const result = await discoveryService.syncDatabase();
        expect(result.upserted).toBe(0);
        expect(result.deleted).toBe(0);

        // Restore config
        await systemConfigService.set(SystemConfigKeys.DISCOVERY.CONFIG, {
            componentTypes: ['process', 'transform.map'],
            testDirectoryFolderName: 'test_folder',
            defaultSyncEnvironmentId: environmentId,
            syncScheduleCron: '0 * * * * *',
            isSyncActive: true,
        });
    });

    it('should allow manual sync even if isSyncActive is false', async () => {
        // Update config to have isSyncActive false
        await systemConfigService.set(SystemConfigKeys.DISCOVERY.CONFIG, {
            componentTypes: ['process', 'transform.map'],
            testDirectoryFolderName: 'test_folder',
            defaultSyncEnvironmentId: environmentId,
            syncScheduleCron: '0 * * * * *',
            isSyncActive: false,
        });

        const mockPlatformService: Partial<IIntegrationPlatformService> = {
            searchComponents: jest.fn().mockImplementation(async function* () {
                yield [
                    { id: 'comp-1', name: 'Test Process 1', type: 'process', folderId: 'folder-1' },
                ];
            }),
            resolveFolderPath: jest.fn().mockResolvedValue('/Root/Test_Folder'),
        };

        jest.spyOn(integrationService, 'getServiceById').mockResolvedValue(mockPlatformService as IIntegrationPlatformService);

        const response = await request(app.getHttpServer())
            .post('/system/sync')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(202);

        // API call should still succeed because isSyncActive applies to the scheduler, not manual invocations
        expect(['Synchronization job enqueued successfully', 'Synchronization is already active']).toContain(response.body.message);
        if (response.body.data) { expect(response.body.data.jobId).toEqual(expect.any(String)); }

        const result = await discoveryService.syncDatabase();
        expect(result).toBeDefined();

        // Restore config
        await systemConfigService.set(SystemConfigKeys.DISCOVERY.CONFIG, {
            componentTypes: ['process', 'transform.map'],
            testDirectoryFolderName: 'test_folder',
            defaultSyncEnvironmentId: environmentId,
            syncScheduleCron: '0 * * * * *',
            isSyncActive: true,
        });
    });

    it('should successfully enqueue sync when environmentId is provided in body', async () => {
        const response = await request(app.getHttpServer())
            .post('/system/sync')
            .send({ environmentId: environmentId })
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(202);

        expect(['Synchronization job enqueued successfully', 'Synchronization is already active']).toContain(response.body.message);
        if (response.body.data) { expect(response.body.data.jobId).toEqual(expect.any(String)); }
    });

    it('should register and execute the discovery sync job correctly, then handle removal on config change', async () => {
        const jobName = 'discovery_sync_job';

        // 1. Manually refresh config to apply what's in SystemConfigService to the Scheduler
        await discoveryScheduler.refreshSchedule();

        // Ensure job scheduler is registered by checking the BullMQ queue
        let jobSchedulers = await backgroundTasksQueue.getJobSchedulers();
        let job = jobSchedulers.find(scheduler => scheduler.name === jobName);
        expect(job).toBeDefined();

        // 2. Update the config to make isSyncActive: false via API so the event is emitted
        await request(app.getHttpServer())
            .patch(`/system/config/${SystemConfigKeys.DISCOVERY.CONFIG}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                value: {
                    componentTypes: ['process', 'transform.map'],
                    testDirectoryFolderName: 'test_folder',
                    defaultSyncEnvironmentId: environmentId,
                    syncScheduleCron: '0 * * * * *',
                    isSyncActive: false,
                }
            })
            .expect(200);

        // Wait briefly for Event Emitter in controller to trigger `discoveryScheduler.refreshSchedule()` async
        await new Promise(resolve => setTimeout(resolve, 100));

        // Attempting to get the job scheduler should now yield nothing
        jobSchedulers = await backgroundTasksQueue.getJobSchedulers();
        job = jobSchedulers.find(scheduler => scheduler.name === jobName);
        expect(job).toBeUndefined();
    });
});
