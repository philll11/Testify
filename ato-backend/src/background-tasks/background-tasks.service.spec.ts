import { Test, TestingModule } from '@nestjs/testing';
import { BackgroundTasksService } from './background-tasks.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('BackgroundTasksService', () => {
    let service: BackgroundTasksService;
    const mockQueue = {
        add: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BackgroundTasksService,
                {
                    provide: getQueueToken('background-tasks'),
                    useValue: mockQueue,
                },
            ],
        }).compile();

        service = module.get<BackgroundTasksService>(BackgroundTasksService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should format and add a crawl-dependencies job to the queue', async () => {
        mockQueue.add.mockResolvedValueOnce({ id: 'job-123' } as any);

        const jobId = await service.enqueueCrawlerJob('col-1', 'env-1');

        expect(jobId).toBe('job-123');
        expect(mockQueue.add).toHaveBeenCalledWith(
            'crawl-dependencies',
            { collectionId: 'col-1', environmentId: 'env-1' },
            expect.objectContaining({ attempts: 3 })
        );
    });
});
