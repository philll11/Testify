import { Injectable, BadRequestException, Inject, forwardRef, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Collection } from './entities/collection.entity';
import { CollectionItem } from './entities/collection-item.entity';
import { DiscoveredComponent } from '../discovery/entities/discovered-component.entity';
import { TestRegistry } from '../test-registry/entities/test-registry.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { CollectionStatus, CollectionType, CollectionItemSourceType } from './enums/collection.enums';
import { AuditsService } from '../system/audits/audits.service';
import { BackgroundTasksService } from '../background-tasks/background-tasks.service';
import { AuditAction } from '../system/audits/entities/audit.entity';
import { Resource } from '../common/constants/permissions.constants';
import { User } from '../iam/users/entities/user.entity';

@Injectable()
export class CollectionsService {
    constructor(
        @InjectRepository(Collection) private readonly collectionRepository: Repository<Collection>,
        @InjectRepository(CollectionItem) private readonly collectionItemRepository: Repository<CollectionItem>,
        @InjectRepository(DiscoveredComponent) private readonly discoveredComponentRepository: Repository<DiscoveredComponent>,
        @InjectRepository(TestRegistry) private readonly testRegistryRepository: Repository<TestRegistry>,
        @Inject(forwardRef(() => AuditsService)) private readonly auditsService: AuditsService,
        @Inject(forwardRef(() => BackgroundTasksService)) private readonly backgroundTasksService: BackgroundTasksService,
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
                    targetPlatform: target.type,
                    tests: targetTests.map(t => ({
                        testId: t.componentId,
                        testName: t.name,
                        testPlatform: t.type
                    }))
                };
            });

            return {
                ...collection,
                manifest,
            };
        }
    }
}