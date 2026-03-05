import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { DiscoveredComponent } from './entities/discovered-component.entity';
import { IntegrationService } from '../integration/integration.service';
import { SystemConfigService } from '../system/config/system-config.service';
import { SystemConfigKeys } from '../common/constants/system-config.constants';
import { UpdateDiscoveryConfigDto } from '../system/config/dto/update-discovery-config.dto';
import { PlatformEnvironmentService } from '../integration/platform-environment/platform-environment.service';
import { QueryDiscoveryComponentParameters } from './interfaces/query-discovery-component-parameters.interface';
import { ComponentTreeNode } from './interfaces/component-tree-node.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class DiscoveryService {
    private readonly logger = new Logger(DiscoveryService.name);

    constructor(
        @InjectRepository(DiscoveredComponent)
        private readonly discoveredComponentRepository: Repository<DiscoveredComponent>,
        private readonly integrationService: IntegrationService,
        private readonly systemConfigService: SystemConfigService,
        private readonly platformEnvironmentService: PlatformEnvironmentService,
        @InjectQueue('background-tasks') private readonly queue: Queue,
    ) { }

    async isSyncActive(): Promise<boolean> {
        const jobs = await this.queue.getJobs(['active', 'waiting', 'delayed']);
        return jobs.some(job => job.name === 'discovery_sync_job');
    }

    async enqueueSyncJob(environmentId?: string): Promise<{ jobId: string }> {
        const isActive = await this.isSyncActive();
        if (isActive) {
            // Already running/queued, return some kind of indication
            // The simplest is just finding the existing one or generating a fake duplicate response 
            // Wait, we can return the active job OR simply throw an HttpException like Conflict
            return { jobId: 'active-sync-job' };
        }

        const job = await this.queue.add('discovery_sync_job', { environmentId }, {
            jobId: `manual-sync-${Date.now()}` // optional but helpful
        });

        return { jobId: job.id! };
    }

    async syncDatabase(manualEnvId?: string): Promise<{ upserted: number; deleted: number }> {
        this.logger.log('Starting State of the World synchronization...');

        // 1. Get Configuration
        const configEntity = await this.systemConfigService.get(SystemConfigKeys.DISCOVERY.CONFIG);
        if (!configEntity || !configEntity.value) {
            this.logger.warn('Discovery configuration not found or empty. Sync cancelled.');
            return { upserted: 0, deleted: 0 };
        }

        const config = configEntity.value as UpdateDiscoveryConfigDto;
        const environmentIdToUse = manualEnvId || config.defaultSyncEnvironmentId;

        if (!environmentIdToUse) {
            this.logger.warn('No sync environment configured or provided. Sync cancelled.');
            return { upserted: 0, deleted: 0 };
        }

        if (!config.componentTypes || config.componentTypes.length === 0) {
            this.logger.warn('No component types configured for sync. Sync cancelled.');
            return { upserted: 0, deleted: 0 };
        }

        try {
            // 2. Initialize Adapter & Get Profile
            // Using 'system' as user ID for backgrounds tasks
            const environment = await this.platformEnvironmentService.findEntityById(environmentIdToUse);
            if (!environment || !environment.profile) {
                this.logger.error(`Failed to start sync: Environment or linked profile not found for config ID: ${environmentIdToUse}`);
                throw new Error('Environment or linked profile not found');
            }
            const profileId = environment.profile.id;

            const service = await this.integrationService.getServiceById('system', environmentIdToUse);

            // 3. Fetch Metadata and Resolve Paths concurrently per page
            this.logger.log(`Fetching components of types: ${config.componentTypes.join(', ')}`);
            const componentStream = service.searchComponents({ types: config.componentTypes });

            // 4. Resolve Folder Paths and Evaluate Rules
            const upsertCandidates: any[] = [];
            const incomingComponentIds = new Set<string>();

            const testDir = config.testDirectoryFolderName ? config.testDirectoryFolderName.toLowerCase() : null;

            this.logger.log(`Starting fetching and folder path resolution stream...`);
            let count = 0;

            for await (const componentsPage of componentStream) {
                this.logger.debug(`Received page of ${componentsPage.length} components. Resolving folder paths...`);

                // Concurrently resolve folder paths for the current page
                const resolvedComponents = await Promise.all(componentsPage.map(async (comp) => {
                    let folderPath = '';
                    if (comp.folderId) {
                        try {
                            folderPath = await service.resolveFolderPath(comp.folderId);
                        } catch (error) {
                            this.logger.warn(`Failed to resolve folder path for component ${comp.id} with folderId ${comp.folderId}`);
                            this.logger.debug(error);
                        }
                    }

                    let isTest = false;
                    if (comp.type === 'process' && testDir && folderPath.toLowerCase().includes(testDir)) {
                        isTest = true;
                    }

                    return {
                        profileId,
                        componentId: comp.id,
                        name: comp.name,
                        type: comp.type,
                        folderId: comp.folderId || null,
                        folderPath: folderPath || null,
                        isTest
                    };
                }));

                for (const comp of resolvedComponents) {
                    upsertCandidates.push(comp);
                    incomingComponentIds.add(comp.componentId);
                }

                count += componentsPage.length;
                this.logger.debug(`Processed ${count} components so far.`);
            }

            this.logger.log(`Folder path resolution complete. Total components processed: ${count}`);

            // 5. Reconcile Database (Upsert & Prune)
            let upsertedCount = 0;
            let deletedCount = 0;

            if (upsertCandidates.length > 0) {
                // Chunk upserts if large
                const chunkSize = 1000;
                this.logger.log(`Starting batched cache upsert of ${upsertCandidates.length} potential records...`);
                for (let i = 0; i < upsertCandidates.length; i += chunkSize) {
                    const chunk = upsertCandidates.slice(i, i + chunkSize);
                    await this.discoveredComponentRepository
                        .createQueryBuilder()
                        .insert()
                        .into(DiscoveredComponent)
                        .values(chunk)
                        .orUpdate(['name', 'type', 'folderId', 'folderPath', 'isTest', 'updatedAt'], ['profileId', 'componentId'])
                        .execute();
                    upsertedCount += chunk.length;
                    this.logger.debug(`Upserted batch [${Math.min(i + chunkSize, upsertCandidates.length)} / ${upsertCandidates.length}]`);
                }
                this.logger.log('Batched cache upsert fully completed.');
            }

            // 6. Prune Stale and Deselected Components
            const incomingArray = Array.from(incomingComponentIds);

            // 6a. Purge Removed Types: Delete components whose type is no longer in the system sync settings
            const purgeRemovedTypesResult = await this.discoveredComponentRepository.createQueryBuilder()
                .delete()
                .from(DiscoveredComponent)
                .where('profileId = :profileId', { profileId })
                .andWhere('type NOT IN (:...configuredTypes)', { configuredTypes: config.componentTypes })
                .execute();
            deletedCount += purgeRemovedTypesResult.affected || 0;

            // 6b. Prune Deleted Components: Delete components that were deleted in Boomi (only for the types we just fetched)
            if (incomingArray.length > 0) {
                const pruneDeletedResult = await this.discoveredComponentRepository.createQueryBuilder()
                    .delete()
                    .from(DiscoveredComponent)
                    .where('profileId = :profileId', { profileId })
                    .andWhere('type IN (:...configuredTypes)', { configuredTypes: config.componentTypes })
                    .andWhere('componentId NOT IN (:...incomingArray)', { incomingArray })
                    .execute();
                deletedCount += pruneDeletedResult.affected || 0;
            }

            this.logger.log(`Synchronization complete. Upserted: ${upsertedCount}, Deleted: ${deletedCount}`);

            // Clear any previous error on success
            if (config.lastSyncError) {
                config.lastSyncError = null;
                await this.systemConfigService.set(SystemConfigKeys.DISCOVERY.CONFIG, config);
            }

            return { upserted: upsertedCount, deleted: deletedCount };
        } catch (error: any) {
            this.logger.error('Error during State of the World synchronization', error.stack || error);

            let explicitMessage = 'Internal server error';
            if (error.isAxiosError && error.response) {
                switch (error.response.status) {
                    case 401: explicitMessage = 'Authentication failed. Please check your credentials.'; break;
                    case 403: explicitMessage = 'Access denied. Your Account ID may be incorrect or your credentials may lack necessary permissions.'; break;
                    case 404: explicitMessage = 'Resource not found. Please verify the Endpoint URL and Account ID.'; break;
                    case 400: explicitMessage = `Bad Request: ${error.response.data?.message || 'Invalid parameters.'}`; break;
                    case 429: explicitMessage = 'Rate limit exceeded. Too many requests.'; break;
                    default: explicitMessage = `Integration API Error: ${error.response.statusText} (${error.response.status})`;
                }
            } else if (error instanceof Error) {
                explicitMessage = error.message;
            } else {
                explicitMessage = String(error);
            }

            if (config.lastSyncError !== explicitMessage) {
                config.lastSyncError = explicitMessage;
                await this.systemConfigService.set(SystemConfigKeys.DISCOVERY.CONFIG, config);
            }

            // Still throw the error so the controller can wrap it in an HttpException for the immediate caller
            throw error;
        }
    }
    async getLastSyncStatus(): Promise<{ lastSyncDate: Date | null, lastSyncError: string | null }> {
        const result = await this.discoveredComponentRepository
            .createQueryBuilder('comp')
            .select('MAX(comp.updatedAt)', 'maxDate')
            .getRawOne();

        const configEntity = await this.systemConfigService.get(SystemConfigKeys.DISCOVERY.CONFIG);
        const config = configEntity?.value as UpdateDiscoveryConfigDto;

        return {
            lastSyncDate: result.maxDate ? new Date(result.maxDate) : null,
            lastSyncError: config?.lastSyncError || null,
        };
    }

    async getComponentsTree({ profileId, isTest, search }: QueryDiscoveryComponentParameters): Promise<ComponentTreeNode[]> {
        const startTotal = performance.now();
        this.logger.debug(`[getComponentsTree] Start - Profile: ${profileId}, search: "${search || ''}"`);

        const query = this.discoveredComponentRepository.createQueryBuilder('comp')
            .where('comp.profileId = :profileId', { profileId })
            .orderBy('comp.folderPath', 'ASC')
            .addOrderBy('comp.name', 'ASC');

        if (isTest !== undefined) {
            query.andWhere('comp.isTest = :isTest', { isTest });
        }

        if (search) {
            query.andWhere('(comp.name ILIKE :search OR comp.folderPath ILIKE :search)', { search: `%${search}%` });
        }

        const startQuery = performance.now();
        const components = await query.getMany();
        this.logger.debug(`[getComponentsTree] Query execution retrieved ${components.length} components. Time: ${(performance.now() - startQuery).toFixed(2)}ms`);

        const startBuild = performance.now();
        const tree = this.buildTree(components);
        this.logger.debug(`[getComponentsTree] Folder structuring and tree building. Time: ${(performance.now() - startBuild).toFixed(2)}ms`);
        this.logger.debug(`[getComponentsTree] Total Backend Execution Time: ${(performance.now() - startTotal).toFixed(2)}ms`);

        return tree;
    }

    private buildTree(components: DiscoveredComponent[]): ComponentTreeNode[] {
        const rootNodes: ComponentTreeNode[] = [];
        const folderMap = new Map<string, ComponentTreeNode>();

        for (const comp of components) {
            // Determine folder path segments
            // Remove leading/trailing slashes for clean split
            const pathStr = comp.folderPath ? comp.folderPath.replace(/^\/+|\/+$/g, '') : '';
            const pathSegments = pathStr ? pathStr.split('/') : [];

            let currentLevelNodes = rootNodes;
            let currentPath = '';

            // Traverse and build folder structure
            for (const segment of pathSegments) {
                currentPath = currentPath ? `${currentPath}/${segment}` : segment;

                if (!folderMap.has(currentPath)) {
                    const newFolderNode: ComponentTreeNode = {
                        id: `folder_${currentPath}`,
                        name: segment,
                        nodeType: 'folder',
                        children: []
                    };
                    folderMap.set(currentPath, newFolderNode);
                    currentLevelNodes.push(newFolderNode);
                }

                const folderNode = folderMap.get(currentPath)!;
                currentLevelNodes = folderNode.children!;
            }

            // Add component as leaf node
            const componentNode: ComponentTreeNode = {
                id: comp.componentId,
                name: comp.name,
                nodeType: 'component',
                data: comp
            };

            currentLevelNodes.push(componentNode);
        }

        return rootNodes;
    }
}
