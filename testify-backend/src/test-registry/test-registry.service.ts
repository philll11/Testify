import {
    Injectable,
    NotFoundException,
    ConflictException,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestRegistry } from './entities/test-registry.entity';
import { CreateTestRegistryDto } from './dto/create-test-registry.dto';
import { AuditsService } from '../system/audits/audits.service';
import { AuditAction } from '../system/audits/entities/audit.entity';
import { Resource } from '../common/constants/permissions.constants';
import { User } from '../iam/users/entities/user.entity';

import { UpdateTestRegistryDto } from './dto/update-test-registry.dto';

@Injectable()
export class TestRegistryService {
    constructor(
        @InjectRepository(TestRegistry)
        private readonly testRegistryRepository: Repository<TestRegistry>,
        @Inject(forwardRef(() => AuditsService))
        private readonly auditsService: AuditsService,
    ) { }

    async create(createDto: CreateTestRegistryDto, requestingUser: User): Promise<TestRegistry> {
        try {
            const mapping = this.testRegistryRepository.create({
                targetComponentId: createDto.targetComponentId,
                testComponentId: createDto.testComponentId,
                isActive: createDto.isActive ?? true,
            });

            const saved = await this.testRegistryRepository.save(mapping);

            await this.auditsService.log(
                Resource.TEST_REGISTRY,
                saved.id,
                AuditAction.CREATE,
                null,
                saved,
                requestingUser.id,
                'Test Registry mapping created'
            );

            return saved;
        } catch (error) {
            if (error.code === '23505') {
                throw new ConflictException('This mapping already exists.');
            }
            throw error;
        }
    }

    async findAll(): Promise<TestRegistry[]> {
        return this.testRegistryRepository.find();
    }

    async findByTargetComponent(targetComponentId: string): Promise<TestRegistry[]> {
        return this.testRegistryRepository.find({
            where: { targetComponentId },
        });
    }

    async findOne(id: string): Promise<TestRegistry> {
        const mapping = await this.testRegistryRepository.findOne({
            where: { id },
        });
        if (!mapping) {
            throw new NotFoundException(`Test registry mapping with ID ${id} not found.`);
        }
        return mapping;
    }

    async update(id: string, updateDto: UpdateTestRegistryDto, requestingUser: User): Promise<TestRegistry> {
        try {
            const existing = await this.findOne(id);
            const original = { ...existing };

            Object.assign(existing, updateDto);

            const saved = await this.testRegistryRepository.save(existing);

            await this.auditsService.log(
                Resource.TEST_REGISTRY,
                saved.id,
                AuditAction.UPDATE,
                original,
                saved,
                requestingUser.id,
                'Test Registry mapping updated'
            );

            return saved;
        } catch (error) {
            if (error.code === '23505') {
                throw new ConflictException('This mapping already exists.');
            }
            throw error;
        }
    }

    async remove(id: string, requestingUser: User): Promise<void> {
        const mapping = await this.testRegistryRepository.findOne({
            where: { id },
        });
        if (!mapping) {
            throw new NotFoundException(`Test registry mapping with ID ${id} not found.`);
        }

        await this.testRegistryRepository.remove(mapping);

        await this.auditsService.log(
            Resource.TEST_REGISTRY,
            id,
            AuditAction.DELETE,
            mapping,
            null,
            requestingUser.id,
            'Test Registry mapping deleted'
        );
    }

    async bulkImport(mappings: CreateTestRegistryDto[], requestingUser: User): Promise<TestRegistry[]> {
        const results: TestRegistry[] = [];
        for (const mappingDto of mappings) {
            try {
                const existing = await this.testRegistryRepository.findOne({
                    where: {
                        targetComponentId: mappingDto.targetComponentId,
                        testComponentId: mappingDto.testComponentId,
                    },
                });

                if (!existing) {
                    const mapping = this.testRegistryRepository.create(mappingDto);
                    const saved = await this.testRegistryRepository.save(mapping);

                    await this.auditsService.log(
                        Resource.TEST_REGISTRY,
                        saved.id,
                        AuditAction.CREATE,
                        null,
                        saved,
                        requestingUser.id,
                        'Test Registry mapping created via bulk import'
                    );

                    results.push(saved);
                }
            } catch (error) {
                console.warn(`Failed to import mapping ${mappingDto.targetComponentId} -> ${mappingDto.testComponentId}: ${error.message}`);
            }
        }
        return results;
    }
}
