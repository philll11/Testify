import { Test, TestingModule } from '@nestjs/testing';
import { BackgroundTasksController } from './background-tasks.controller';
import { getQueueToken } from '@nestjs/bullmq';
import { JwtAuthGuard } from '../iam/auth/jwt-auth.guard';

describe('BackgroundTasksController', () => {
    let controller: BackgroundTasksController;
    const mockQueue = {
        getJob: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [BackgroundTasksController],
            providers: [
                {
                    provide: getQueueToken('background-tasks'),
                    useValue: mockQueue,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<BackgroundTasksController>(BackgroundTasksController);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should return not_found if job does not exist', async () => {
        mockQueue.getJob.mockResolvedValueOnce(null);
        const result = await controller.getJobStatus('fake-id');
        expect(result).toEqual({ status: 'not_found' });
    });

    it('should return job status details', async () => {
        const mockJob = {
            id: 'job-1',
            name: 'crawl-dependencies',
            getState: jest.fn().mockResolvedValue('completed'),
            progress: 100,
            failedReason: null,
            finishedOn: 12345678,
            processedOn: 12345670,
        };
        mockQueue.getJob.mockResolvedValueOnce(mockJob as any);

        const result = await controller.getJobStatus('job-1');
        expect(result).toEqual({
            id: 'job-1',
            name: 'crawl-dependencies',
            status: 'completed',
            progress: 100,
            failedReason: null,
            finishedOn: 12345678,
            processedOn: 12345670,
        });
    });
});
