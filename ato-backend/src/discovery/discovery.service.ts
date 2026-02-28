import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { DiscoveredComponent } from './entities/discovered-component.entity';
import { IntegrationService } from '../integration/integration.service';
import { SystemConfigService } from '../system/config/system-config.service';
import { SystemConfigKeys } from '../common/constants/system-config.constants';
import { UpdateDiscoveryConfigDto } from '../system/config/dto/update-discovery-config.dto';
import { PlatformEnvironmentService } from '../integration/platform-environment/platform-environment.service';
import { GetDiscoveryComponentsDto } from './dto/get-discovery-components.dto';
import { ComponentTreeNode } from './interfaces/component-tree-node.interface';

@Injectable()
export class DiscoveryService {
    private readonly logger = new Logger(DiscoveryService.name);

    constructor(
        @InjectRepository(DiscoveredComponent)
        private readonly discoveredComponentRepository: Repository<DiscoveredComponent>,
        private readonly integrationService: IntegrationService,
        private readonly systemConfigService: SystemConfigService,
        private readonly platformEnvironmentService: PlatformEnvironmentService,
    ) { }

    async syncDatabase(): Promise<{ upserted: number; deleted: number }> {
        this.logger.log('Starting State of the World synchronization...');

        // 1. Get Configuration
        const configEntity = await this.systemConfigService.get(SystemConfigKeys.DISCOVERY.CONFIG);
        if (!configEntity || !configEntity.value) {
            this.logger.warn('Discovery configuration not found or empty. Sync cancelled.');
            return { upserted: 0, deleted: 0 };
        }

        const config = configEntity.value as UpdateDiscoveryConfigDto;
        if (!config.defaultSyncEnvironmentId) {
            this.logger.warn('No default sync environment configured. Sync cancelled.');
            return { upserted: 0, deleted: 0 };
        }

        if (!config.componentTypes || config.componentTypes.length === 0) {
            this.logger.warn('No component types configured for sync. Sync cancelled.');
            return { upserted: 0, deleted: 0 };
        }

        try {
            // 2. Initialize Adapter & Get Profile
            // Using 'system' as user ID for backgrounds tasks
            const environment = await this.platformEnvironmentService.findEntityById(config.defaultSyncEnvironmentId);
            if (!environment || !environment.profile) {
                throw new Error('Environment or linked profile not found');
            }
            const profileId = environment.profile.id;

            const service = await this.integrationService.getServiceById('system', config.defaultSyncEnvironmentId);

            // 3. Fetch Metadata
            this.logger.log(`Fetching components of types: ${config.componentTypes.join(', ')}`);
            const components = await service.searchComponents({ types: config.componentTypes });
            this.logger.log(`Fetched ${components.length} components from platform.`);

            // 4. Resolve Folder Paths and Evaluate Rules
            const upsertCandidates: any[] = [];
            const incomingComponentIds = new Set<string>();

            const testDir = config.testDirectoryFolderName ? config.testDirectoryFolderName.toLowerCase() : null;

            for (const comp of components) {
                let folderPath = '';
                if (comp.folderId) {
                    folderPath = await service.resolveFolderPath(comp.folderId);
                }

                let isTest = false;
                if (comp.type === 'process' && testDir && folderPath.toLowerCase().includes(testDir)) {
                    isTest = true;
                }

                upsertCandidates.push({
                    profileId,
                    componentId: comp.id,
                    name: comp.name,
                    type: comp.type,
                    folderId: comp.folderId || null,
                    folderPath: folderPath || null,
                    isTest
                });

                incomingComponentIds.add(comp.id);
            }

            // 5. Reconcile Database (Upsert & Prune)
            let upsertedCount = 0;
            let deletedCount = 0;

            if (upsertCandidates.length > 0) {
                // Chunk upserts if large
                const chunkSize = 1000;
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
                }
            }

            // Prune components in this profile that were not in the payload
            const incomingArray = Array.from(incomingComponentIds);
            let pruneQuery = this.discoveredComponentRepository.createQueryBuilder()
                .delete()
                .from(DiscoveredComponent)
                .where('profileId = :profileId', { profileId });

            if (incomingArray.length > 0) {
                pruneQuery = pruneQuery.andWhere('componentId NOT IN (:...incomingArray)', { incomingArray });
            }

            const deleteResult = await pruneQuery.execute();
            deletedCount = deleteResult.affected || 0;

            this.logger.log(`Synchronization complete. Upserted: ${upsertedCount}, Deleted: ${deletedCount}`);

            return { upserted: upsertedCount, deleted: deletedCount };
        } catch (error) {
            this.logger.error('Error during State of the World synchronization', error instanceof Error ? error.stack : error);
            throw error;
        }
    }

    async getComponentsTree(queryDto: GetDiscoveryComponentsDto): Promise<ComponentTreeNode[]> {
        const { profileId, isTest, search } = queryDto;

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

        const components = await query.getMany();
        return this.buildTree(components);
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
