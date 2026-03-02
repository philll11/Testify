import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { SchedulerRegistry } from '@nestjs/schedule';
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
    let schedulerRegistry: SchedulerRegistry;
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
        schedulerRegistry = app.get(SchedulerRegistry);
        discoveryService = app.get(DiscoveryService);
        discoveryScheduler = app.get(DiscoveryScheduler);

        // Create Admin Role & User
        const adminRole = await roleRepository.save(
            roleRepository.create({
                recordId: 'ROLE_SYNC_ADMIN',
                name: 'Sync Admin',
                permissions: [PERMISSIONS.DISCOVERY_SYNC, PERMISSIONS.DISCOVERY_VIEW, PERMISSIONS.SYSTEM_CONFIG_EDIT, PERMISSIONS.SYSTEM_CONFIG_VIEW],
            }),
        );

        const adminUser = await userRepository.save(
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

        adminToken = jwtService.sign({ sub: adminUser.recordId, tokenVersion: 0 });

        // Seed Profile
        const profile = await profileService.create({
            name: 'E2E Boomi Profile',
            accountId: 'boomi-test-account',
            platformType: IntegrationPlatform.BOOMI,
            description: 'Profile for syncing',
            config: { pollInterval: 50 },
        });
        profileId = profile.id;

        // Seed Environment
        const environment = await environmentService.create({
            name: 'E2E Sync Env',
            description: 'Env for syncing',
            profileId: profile.id,
            isDefault: true,
            credentials: {
                username: 'test-user',
                passwordOrToken: 'secret',
                executionInstanceId: 'atom-id-1',
            },
        });
        environmentId = environment.id;

        // Set Discovery Config
        await systemConfigService.set(SystemConfigKeys.DISCOVERY.CONFIG, {
            componentTypes: ['process', 'transform.map'],
            testDirectoryFolderName: 'test_folder',
            defaultSyncEnvironmentId: environment.id,
            syncScheduleCron: '0 * * * * *',
            isSyncActive: true,
        });
    });

    afterAll(async () => {
        await teardownTestApp({ app, dataSource });
    });

    afterEach(() => {
        jest.clearAllMocks();
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
            .expect(200);

        // 3. Verify response
        expect(response.body.message).toBe('Synchronization successful');
        expect(response.body.data.upserted).toBe(3);

        // 4. Verify DB State & Test Logic Evaluation
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

        // 3. Execute via REST endpoint
        const response = await request(app.getHttpServer())
            .post('/system/sync')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        // 4. DB should only have the 1 remaining component, and it should be updated
        expect(response.body.data.upserted).toBe(1);
        expect(response.body.data.deleted).toBe(2);

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

        const response = await request(app.getHttpServer())
            .post('/system/sync')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(response.body.message).toBe('Synchronization successful');
        expect(response.body.data.upserted).toBe(0);
        expect(response.body.data.deleted).toBe(0);

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
            .expect(200);

        // API call should still succeed because isSyncActive applies to the scheduler, not manual invocations
        expect(response.body.message).toBe('Synchronization successful');
        expect(response.body.data).toBeDefined();

        // Restore config
        await systemConfigService.set(SystemConfigKeys.DISCOVERY.CONFIG, {
            componentTypes: ['process', 'transform.map'],
            testDirectoryFolderName: 'test_folder',
            defaultSyncEnvironmentId: environmentId,
            syncScheduleCron: '0 * * * * *',
            isSyncActive: true,
        });
    });

    it('should register and execute the discovery sync job correctly, then handle removal on config change', async () => {
        const jobName = 'discovery_sync_job';

        // 1. Manually refresh config to apply what's in SystemConfigService to the Scheduler
        await discoveryScheduler.refreshSchedule();

        // Ensure job is registered and check its registration
        const job = schedulerRegistry.getCronJob(jobName);
        expect(job).toBeDefined();

        // 2. We can fire it securely and it calls syncDatabase
        jest.spyOn(discoveryService, 'syncDatabase').mockResolvedValue(undefined as any);

        // Fire job locally
        job.fireOnTick();

        // Because it is async inside the job wrapper, we need to wait a tick to allow the Promise chain to start
        await new Promise(resolve => setTimeout(resolve, 50));

        // Expect syncDatabase to be called
        expect(discoveryService.syncDatabase).toHaveBeenCalled();

        // 3. Update the config to make isSyncActive: false via API so the event is emitted
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
        await new Promise(resolve => setTimeout(resolve, 50));

        // Attempting to get the job should now throw since it was gracefully removed
        expect(() => schedulerRegistry.getCronJob(jobName)).toThrow();
    });
});
