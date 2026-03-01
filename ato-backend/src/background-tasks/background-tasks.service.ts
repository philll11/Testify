import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class BackgroundTasksService {
    private readonly logger = new Logger(BackgroundTasksService.name);

    constructor(
        @InjectQueue('background-tasks') private readonly backgroundTasksQueue: Queue,
    ) { }

    async enqueueCrawlerJob(collectionId: string, folderId: string, environmentId: string): Promise<string> {
        this.logger.log(`Enqueuing crawl-dependencies job for collection ${collectionId} on folder ${folderId}`);
        const job = await this.backgroundTasksQueue.add('crawl-dependencies', {
            collectionId,
            folderId,
            environmentId,
        }, {
            // Options like retry, delay, etc.
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            }
        });
        return job.id!;
    }
}