import { Injectable, BadRequestException, Inject, forwardRef, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Collection } from './entities/collection.entity';
import { CollectionItem } from './entities/collection-item.entity';
import { DiscoveredComponent } from '../discovery/entities/discovered-component.entity';
import { TestRegistry } from '../test-registry/entities/test-registry.entity';
import { PlatformEnvironment } from '../integration/platform-environment/entities/platform-environment.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { ExecuteCollectionDto } from './dto/execute-collection.dto';
import { CollectionStatus, CollectionType, CollectionItemSourceType } from './enums/collection.enums';
import { AuditsService } from '../system/audits/audits.service';
import { BackgroundTasksService } from '../background-tasks/background-tasks.service';
import { AuditAction } from '../system/audits/entities/audit.entity';
import { Resource } from '../common/constants/permissions.constants';
import { User } from '../iam/users/entities/user.entity';
import { ExecutionEngineService } from '../execution-engine/execution-engine.service';

@Injectable()
export class CollectionsService {
    constructor(
        @InjectRepository(Collection) private readonly collectionRepository: Repository<Collection>,
        @InjectRepository(CollectionItem) private readonly collectionItemRepository: Repository<CollectionItem>,
        @InjectRepository(DiscoveredComponent) private readonly discoveredComponentRepository: Repository<DiscoveredComponent>,
        @InjectRepository(TestRegistry) private readonly testRegistryRepository: Repository<TestRegistry>,
        @InjectRepository(PlatformEnvironment) private readonly environmentRepository: Repository<PlatformEnvironment>,
        @Inject(forwardRef(() => AuditsService)) private readonly auditsService: AuditsService,
        @Inject(forwardRef(() => BackgroundTasksService)) private readonly backgroundTasksService: BackgroundTasksService,
        private readonly executionEngineService: ExecutionEngineService,
    ) { }

    async create(createDto: CreateCollectionDto, requestingUser: User): Promise<Collection> {
        const { name, collectionType, environmentId, componentIds, crawlDependencies } = createDto;

        let discovered: any[] = [];
        if (componentIds.length > 0) {
            discovered = await this.discoveredComponentRepository.find({
                where: { componentId: In(componentIds) },
            });

            if (discovered.length === 0) {
                throw new BadRequestException('None of the specified components were found in the local discovery cache.');
            }

            if (collectionType === CollectionType.TESTS) {
                const invalidTests = discovered.filter(comp => !comp.isTest);
                if (invalidTests.length > 0) {
                    throw new BadRequestException(`Collection is of type TESTS, but some components are not tests: ${invalidTests.map(c => c.componentId).join(', ')}`);
                }
            }
        }

        const itemsToCreate = Array.from(new Set(componentIds)).map(compId => {
            const item = new CollectionItem();
            item.componentId = compId;
            item.sourceType = CollectionItemSourceType.ARG; // Direct request
            return item;
        });

        const collection = this.collectionRepository.create({
            name,
            collectionType,
            status: CollectionStatus.AWAITING_SELECTION,
            environmentId,
            items: itemsToCreate,
        });

        const saved = await this.collectionRepository.save(collection);

        if (crawlDependencies && environmentId && collectionType === CollectionType.TARGETS) {
            await this.backgroundTasksService.enqueueCrawlerJob(saved.id, environmentId);
        }

        await this.auditsService.log(
            Resource.COLLECTION,
            saved.id,
            AuditAction.CREATE,
            null,
            saved,
            requestingUser.id,
            'Collection created'
        );

        return saved;
    }

    async findAll(): Promise<Collection[]> {
        return this.collectionRepository.find({
            order: { createdAt: 'DESC' }
        });
    }

    async findOne(id: string, requestingUser: User): Promise<any> {
        const collection = await this.collectionRepository.findOne({
            where: { id },
            relations: ['items'],
        });

        if (!collection) {
            throw new NotFoundException(`Collection with ID ${id} not found`);
        }

        const compIds = collection.items.map(item => item.componentId);

        if (compIds.length === 0) {
            return {
                ...collection,
                manifest: [],
            };
        }

        if (collection.collectionType === CollectionType.TESTS) {
            const tests = await this.discoveredComponentRepository.find({
                where: { componentId: In(compIds) },
            });

            return {
                ...collection,
                manifest: tests,
            };
        } else {
            const targets = await this.discoveredComponentRepository.find({
                where: { componentId: In(compIds) },
            });

            const mappings = await this.testRegistryRepository.find({
                where: { targetComponentId: In(compIds) },
            });

            const testIds = mappings.map(m => m.testComponentId);

            let allTests: DiscoveredComponent[] = [];
            if (testIds.length > 0) {
                allTests = await this.discoveredComponentRepository.find({
                    where: { componentId: In(testIds) },
                });
            }

            const manifest = targets.map(target => {
                const targetMappings = mappings.filter(m => m.targetComponentId === target.componentId);
                const targetTestIds = targetMappings.map(m => m.testComponentId);
                const targetTests = allTests.filter(t => targetTestIds.includes(t.componentId));

                return {
                    targetId: target.componentId,
                    targetName: target.name,
                    targetPath: target.folderPath,
                    targetPlatform: target.type,
                    profileId: target.profileId,
                    tests: targetTests.map(t => ({
                        testId: t.componentId,
                        testName: t.name,
                        testPath: t.folderPath,
                        testPlatform: t.type,
                        profileId: t.profileId
                    }))
                };
            });

            const totalTargets = targets.length;
            const coveredTargets = manifest.filter(m => m.tests.length > 0).length;
            const uncoveredTargets = totalTargets - coveredTargets;
            const coveragePercentage = totalTargets > 0 ? Math.round((coveredTargets / totalTargets) * 10000) / 100 : 0;

            const coverage = {
                totalTargets,
                coveredTargets,
                uncoveredTargets,
                coveragePercentage
            };

            return {
                ...collection,
                manifest,
                coverage,
            };
        }
    }

    async execute(id: string, executeDto: ExecuteCollectionDto, requestingUser: User): Promise<void> {
        const { environmentId, testsToRun } = executeDto;

        const collection = await this.collectionRepository.findOne({
            where: { id },
            relations: ['items'],
        });

        if (!collection) {
            throw new NotFoundException(`Collection with ID ${id} not found`);
        }

        // 1. Fetch Environment to get its Profile ID
        const targetEnvironment = await this.environmentRepository.findOne({ where: { id: environmentId } });
        if (!targetEnvironment) {
            throw new BadRequestException(`Environment with ID ${environmentId} not found`);
        }
        const targetProfileId = targetEnvironment.profileId;

        // 2. Fetch components to validate Profile ID mismatch
        const compIds = collection.items.map(item => item.componentId);
        if (compIds.length > 0) {
            const components = await this.discoveredComponentRepository.find({
                where: { componentId: In(compIds) },
            });

            const mismatchedComponents = components.filter(c => c.profileId !== targetProfileId);
            if (mismatchedComponents.length > 0) {
                throw new BadRequestException('Environment profile mismatch: This collection contains components that do not belong to the requested environment\'s platform.');
            }
        }

        // Update status to executing
        collection.status = CollectionStatus.EXECUTING;
        collection.environmentId = environmentId;
        await this.collectionRepository.save(collection);

        await this.auditsService.log(
            Resource.COLLECTION,
            collection.id,
            AuditAction.EXECUTE,
            null,
            { passedEnvironmentId: environmentId, requestedTests: testsToRun },
            requestingUser.id,
            'Collection execution started'
        );

        // Resolve test IDs based on collection type
        let resolvedTestIds: string[] = [];

        if (collection.collectionType === CollectionType.TESTS) {
            resolvedTestIds = compIds;
        } else {
            const mappings = await this.testRegistryRepository.find({
                where: { targetComponentId: In(compIds) },
            });
            resolvedTestIds = [...new Set(mappings.map(m => m.testComponentId))];
        }

        if (resolvedTestIds.length === 0) {
            throw new BadRequestException('Cannot execute collection: No executable tests mapped to the provided targets.');
        }

        let finalTestIds = resolvedTestIds;
        if (testsToRun && testsToRun.length > 0) {
            finalTestIds = resolvedTestIds.filter(id => testsToRun.includes(id));
            if (finalTestIds.length === 0) {
                throw new BadRequestException('Cannot execute collection: None of the requested tests are mapped to this collection.');
            }
        }

        // Dispatch to BullMQ execution queue via ExecutionEngineService
        await this.executionEngineService.queueCollectionExecution(collection.id, environmentId, finalTestIds);
    }

    async remove(id: string, requestingUser: User): Promise<void> {
        const collection = await this.collectionRepository.findOne({ where: { id } });

        if (!collection) {
            throw new NotFoundException(`Collection with ID ${id} not found`);
        }

        await this.auditsService.log(
            Resource.COLLECTION,
            collection.id,
            AuditAction.DELETE,
            collection,
            null,
            requestingUser.id,
            'Collection deleted'
        );

        await this.collectionRepository.remove(collection);
    }
}