import { Test, TestingModule } from '@nestjs/testing';
import { BackgroundTasksWorker } from './background-tasks.worker';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CollectionItem } from '../collections/entities/collection-item.entity';
import { PlatformEnvironment } from '../integration/platform-environment/entities/platform-environment.entity';
import { IntegrationService } from '../integration/integration.service';
import { DiscoveryService } from '../discovery/discovery.service';

describe('BackgroundTasksWorker', () => {
    let worker: BackgroundTasksWorker;

    const mockCollectionItemRepo = {
        save: jest.fn(),
        find: jest.fn(),
    };

    const mockPlatformEnvironmentRepo = {
        findOne: jest.fn(),
    };

    const mockIntegrationService = {
        getServiceById: jest.fn(),
    };

    const mockDiscoveryService = {
        syncDatabase: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BackgroundTasksWorker,
                { provide: getRepositoryToken(CollectionItem), useValue: mockCollectionItemRepo },
                { provide: getRepositoryToken(PlatformEnvironment), useValue: mockPlatformEnvironmentRepo },
                { provide: IntegrationService, useValue: mockIntegrationService },
                { provide: DiscoveryService, useValue: mockDiscoveryService },
            ],
        }).compile();

        worker = module.get<BackgroundTasksWorker>(BackgroundTasksWorker);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(worker).toBeDefined();
    });

    it('should process discovery_sync_job correctly', async () => {
        const job = { name: 'discovery_sync_job', id: 'sync-1', data: { environmentId: 'env-123' } } as any;
        mockDiscoveryService.syncDatabase.mockResolvedValueOnce(undefined);

        const result = await worker.process(job);

        expect(mockDiscoveryService.syncDatabase).toHaveBeenCalledWith('env-123', job);
        expect(result).toEqual({ success: true });
    });

    it('should throw an error for unknown jobs', async () => {
        const job = { name: 'unknown_job', id: 'unk-1' } as any;
        await expect(worker.process(job)).rejects.toThrow('Unknown job type: unknown_job');
    });

    it('should call handleCrawlDependencies and handle repository updates when crawling', async () => {
        const job = {
            id: 'job-1',
            name: 'crawl-dependencies',
            data: { collectionId: 'col-1', environmentId: 'env-1' },
        } as any;

        const mockEnv = { id: 'env-1', profile: { platform: 'BOOMI' } };
        mockPlatformEnvironmentRepo.findOne.mockResolvedValueOnce(mockEnv);

        // Pre-existing collection items acting as roots
        mockCollectionItemRepo.find = jest.fn().mockResolvedValueOnce([
            { componentId: 'comp-1' },
            { componentId: 'comp-2' }
        ]);

        const mockPlatformService = {
            getComponentInfoAndDependencies: jest.fn().mockImplementation((id: string) => {
                if (id === 'comp-1') return Promise.resolve({ id: 'comp-1', name: 'process 1', type: 'Process', dependencyIds: ['dep-1'] });
                if (id === 'comp-2') return Promise.resolve({ id: 'comp-2', name: 'process 2', type: 'ProcessRoute', dependencyIds: [] });
                if (id === 'dep-1') return Promise.resolve({ id: 'dep-1', name: 'connection 1', type: 'Connection', dependencyIds: ['dep-2'] });
                if (id === 'dep-2') return Promise.resolve({ id: 'dep-2', name: 'map 1', type: 'Map', dependencyIds: [] });
                return Promise.resolve(null);
            }),
        };
        mockIntegrationService.getServiceById.mockResolvedValueOnce(mockPlatformService);

        mockCollectionItemRepo.save.mockResolvedValueOnce([]); // Mock void save

        await worker.process(job);

        expect(mockPlatformEnvironmentRepo.findOne).toHaveBeenCalledWith({ where: { id: 'env-1' }, relations: ['profile'] });
        expect(mockIntegrationService.getServiceById).toHaveBeenCalledWith('SYSTEM', 'env-1');
        expect(mockCollectionItemRepo.find).toHaveBeenCalledWith({ where: { collectionId: 'col-1' } });
        expect(mockPlatformService.getComponentInfoAndDependencies).toHaveBeenCalledWith('comp-1');
        expect(mockPlatformService.getComponentInfoAndDependencies).toHaveBeenCalledWith('dep-1');
        expect(mockPlatformService.getComponentInfoAndDependencies).toHaveBeenCalledWith('dep-2');

        // Checks that only new dependencies are passed to the repository save
        expect(mockCollectionItemRepo.save).toHaveBeenCalled();
        const saveCallArg = mockCollectionItemRepo.save.mock.calls[0][0];
        expect(saveCallArg.length).toBe(2);
        const discoveredIds = saveCallArg.map((a: any) => a.componentId);
        expect(discoveredIds).toContain('dep-1');
        expect(discoveredIds).toContain('dep-2');
        expect(discoveredIds).not.toContain('comp-1'); // Already existed
        expect(discoveredIds).not.toContain('comp-2'); // Already existed
    });
});
