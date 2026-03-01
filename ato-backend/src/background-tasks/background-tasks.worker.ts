import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CollectionItem } from '../collections/entities/collection-item.entity';
import { CollectionItemSourceType } from '../collections/enums/collection.enums';
import { IntegrationService } from '../integration/integration.service';
import { IntegrationPlatform } from '../integration/constants/integration-platform.enum';
import { PlatformEnvironment } from '../integration/platform-environment/entities/platform-environment.entity';

@Processor('background-tasks')
@Injectable()
export class BackgroundTasksWorker extends WorkerHost {
    private readonly logger = new Logger(BackgroundTasksWorker.name);

    constructor(
        @InjectRepository(CollectionItem)
        private readonly collectionItemRepository: Repository<CollectionItem>,
        @InjectRepository(PlatformEnvironment)
        private readonly platformEnvironmentRepository: Repository<PlatformEnvironment>,
        private readonly integrationService: IntegrationService,
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        this.logger.log('Processing job ' + job.id + ' of type ' + job.name + '...');

        switch (job.name) {
            case 'crawl-dependencies':
                return this.handleCrawlDependencies(job);
            default:
                this.logger.warn('Unknown job type: ' + job.name);
                throw new Error('Unknown job type: ' + job.name);
        }
    }

    private async handleCrawlDependencies(job: Job<{ collectionId: string, folderId: string, environmentId: string }>): Promise<void> {
        const { collectionId, folderId, environmentId } = job.data;

        this.logger.log('Starting recursive crawl for folder ' + folderId + ' in environment ' + environmentId);

        try {
            // Find Environment to get Platform type
            const environment = await this.platformEnvironmentRepository.findOne({
                where: { id: environmentId },
                relations: ['profile'],
            });

            if (!environment || !environment.profile) {
                throw new Error('Environment or Platform Profile not found');
            }

            // Let's assume we fetch dependent components somehow:
            // This is pseudo-logic, matching the request to simulate external API
            // For real integration this would query Boomi or other platforms
            const platformService = await this.integrationService.getServiceById(
                'SYSTEM',
                environment.id
            );

            // Fetch folder path to be able to search via folderNames
            const folderPath = await platformService.resolveFolderPath(folderId);
            const folderName = folderPath.split('/').pop() || folderId;

            const generator = platformService.searchComponents({ folderNames: [folderName], types: ['Process', 'ProcessRoute'] });
            const components: any[] = [];
            for await (const batch of generator) {
                for (const component of batch) {
                    components.push(component);
                }
            }

            this.logger.log('Crawl found ' + components.length + ' nested dependencies.');

            const items: CollectionItem[] = [];
            for (const comp of components) {
                const item = new CollectionItem();
                item.collectionId = collectionId;
                item.componentId = comp.id;
                item.sourceType = CollectionItemSourceType.DISCOVERED;
                items.push(item);
            }

            // Save chunked to avoid large transaction issues
            await this.collectionItemRepository.save(items, { chunk: 100 });

            this.logger.log('Job ' + job.id + ' successfully created ' + items.length + ' CollectionItems.');

        } catch (error: any) {
            this.logger.error('Failed to finish crawling. Error: ' + error.message, error.stack);
            throw error;
        }
    }
}