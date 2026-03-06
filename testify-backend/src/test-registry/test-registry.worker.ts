import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TestRegistryService } from './test-registry.service';
import { DiscoveryService } from '../discovery/discovery.service';

@Processor('test-registry-tasks')
export class TestRegistryWorker extends WorkerHost {
    private readonly logger = new Logger(TestRegistryWorker.name);

    constructor(
        private readonly testRegistryService: TestRegistryService,
        private readonly discoveryService: DiscoveryService,
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        this.logger.log(`Starting job ${job.name} (ID: ${job.id})`);

        switch (job.name) {
            case 'import_csv':
                return this.handleImportCsv(job);
            case 'fetch_metadata':
                return this.handleFetchMetadata(job);
            default:
                this.logger.warn(`Unknown job type: ${job.name}`);
                throw new Error(`Unknown job type: ${job.name}`);
        }
    }

    private async handleImportCsv(job: Job) {
        const { mappings, requestingUserId, profileId, environmentId } = job.data;
        const result = await this.testRegistryService.processBulkImport(job, mappings, requestingUserId, profileId);

        // After successful import, trigger targeted discovery
        const importedIds = result.successItems.flatMap(m => [m.targetComponentId, m.testComponentId]);
        if (importedIds.length > 0) {
            await this.discoveryService.syncTargetedComponents(environmentId, [...new Set(importedIds)]);

            // Heal the denormalized component names for the newly imported items
            const registryIds = result.successItems.map(m => m.id);
            if (registryIds.length > 0) {
                await this.testRegistryService.healDenormalizedNames(registryIds);
            }
        }

        return result;
    }

    private async handleFetchMetadata(job: Job) {
        const { id, targetComponentId, testComponentId, environmentId } = job.data;
        await this.discoveryService.syncTargetedComponents(environmentId, [targetComponentId, testComponentId]);

        // Heal the denormalized component names for the newly created item
        if (id) {
            await this.testRegistryService.healDenormalizedNames([id]);
        }
    }
}
