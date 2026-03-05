import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CollectionItem } from '../collections/entities/collection-item.entity';
import { CollectionItemSourceType } from '../collections/enums/collection.enums';
import { IntegrationService } from '../integration/integration.service';
import { ComponentInfo, IIntegrationPlatformService } from '../integration/interfaces/integration-platform.interface';
import { IntegrationPlatform } from '../integration/constants/integration-platform.enum';
import { PlatformEnvironment } from '../integration/platform-environment/entities/platform-environment.entity';
import { DiscoveryService } from '../discovery/discovery.service';

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
        private readonly discoveryService: DiscoveryService,
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        this.logger.log('Processing job ' + job.id + ' of type ' + job.name + '...');

        switch (job.name) {
            case 'crawl-dependencies':
                return this.handleCrawlDependencies(job);
            case 'discovery_sync_job':
                this.logger.log('Executing database sync from queue...');
                await this.discoveryService.syncDatabase(job.data?.environmentId);
                return { success: true };
            default:
                this.logger.warn('Unknown job type: ' + job.name);
                throw new Error('Unknown job type: ' + job.name);
        }
    }

    private async handleCrawlDependencies(job: Job<{ collectionId: string, environmentId: string }>): Promise<void> {
        const { collectionId, environmentId } = job.data;

        this.logger.log('Starting recursive crawl for collection ' + collectionId + ' in environment ' + environmentId);

        try {
            // Find Environment to get Platform type
            const environment = await this.platformEnvironmentRepository.findOne({
                where: { id: environmentId },
                relations: ['profile'],
            });

            if (!environment || !environment.profile) {
                throw new Error('Environment or Platform Profile not found');
            }

            const platformService = await this.integrationService.getServiceById(
                'SYSTEM',
                environment.id
            );

            // Phase 1: Retrieve existing Collection components to act as entry points
            const existingItems = await this.collectionItemRepository.find({
                where: { collectionId: collectionId }
            });

            if (existingItems.length === 0) {
                this.logger.log('No root components found in collection. Ending crawl.');
                return;
            }

            const rootComponentIds = existingItems.map(item => item.componentId);
            this.logger.log(`Found ${rootComponentIds.length} root components in collection. Starting recursive dependency resolution...`);

            // Phase 2: Recursively fetch all dependencies and memoize to avoid circular loops
            const finalComponentsMap = new Map<string, ComponentInfo>();

            const _recursiveHelper = async (componentId: string): Promise<void> => {
                if (finalComponentsMap.has(componentId)) return; // Memoization / Circular dependency protection

                const componentInfo = await platformService.getComponentInfoAndDependencies(componentId);

                if (!componentInfo) {
                    // Cache missed/deleted components so we don't spam requests for them
                    finalComponentsMap.set(componentId, { id: componentId, name: 'Component Not Found', type: 'N/A', dependencyIds: [] });
                    return;
                }

                finalComponentsMap.set(componentId, componentInfo);

                // Recursively fetch all listed direct dependencies concurrently
                const discoveryPromises = componentInfo.dependencyIds.map(depId => _recursiveHelper(depId));
                await Promise.all(discoveryPromises);
            };

            // Start recursion from all discovered root entries
            for (const rootId of rootComponentIds) {
                await _recursiveHelper(rootId);
            }

            const discoveredComponents = Array.from(finalComponentsMap.values()).filter(c => c.type !== 'N/A');

            this.logger.log(`Recursive crawl finished. Discovered ${discoveredComponents.length} total unique components/dependencies.`);

            const existingItemIds = new Set(rootComponentIds);
            const items: CollectionItem[] = [];

            for (const comp of discoveredComponents) {
                if (!existingItemIds.has(comp.id)) {
                    const item = new CollectionItem();
                    item.collectionId = collectionId;
                    item.componentId = comp.id;
                    item.sourceType = CollectionItemSourceType.DISCOVERED;
                    items.push(item);
                }
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