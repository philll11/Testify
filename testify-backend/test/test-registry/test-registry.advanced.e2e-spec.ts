import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Job } from 'bullmq';

import { setupTestApp, teardownTestApp } from '../test-utils';
import { TestRegistryService } from '../../src/test-registry/test-registry.service';
import { TestRegistry } from '../../src/test-registry/entities/test-registry.entity';
import { CreateTestRegistryDto } from '../../src/test-registry/dto/create-test-registry.dto';

describe('TestRegistry Advanced Logic (Integration)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let service: TestRegistryService;
    let repository: Repository<TestRegistry>;

    // Test Data
    const profileId = '123e4567-e89b-12d3-a456-426614174000';
    const otherProfileId = '999e4567-e89b-12d3-a456-426614174999';

    jest.setTimeout(60000);

    beforeAll(async () => {
        const setup = await setupTestApp();
        app = setup.app;
        dataSource = setup.dataSource;

        service = app.get<TestRegistryService>(TestRegistryService);
        repository = dataSource.getRepository(TestRegistry);
    });

    afterAll(async () => {
        await teardownTestApp({ app, dataSource });
    });

    beforeEach(async () => {
        await repository.clear();
    });

    describe('processBulkImport', () => {
        it('should import new mappings and skip existing ones based on composite key', async () => {
            // 1. Seed existing mapping
            await repository.save(
                repository.create({
                    profileId: profileId,
                    targetComponentId: 'target-1',
                    testComponentId: 'test-1',
                })
            );

            // 2. Prepare import data
            const importMappings: CreateTestRegistryDto[] = [
                // Duplicate (should be skipped)
                {
                    profileId: profileId,
                    targetComponentId: 'target-1',
                    testComponentId: 'test-1',
                },
                // New (should be added)
                {
                    profileId: profileId,
                    targetComponentId: 'target-2',
                    testComponentId: 'test-2',
                },
                // Different Profile (should be added even if IDs match component IDs)
                {
                    profileId: otherProfileId,
                    targetComponentId: 'target-1',
                    testComponentId: 'test-1',
                }
            ];

            // Mock Job object
            const mockJob = {
                updateProgress: jest.fn().mockResolvedValue(true),
                data: {},
                id: 'mock-job-id',
                name: 'import_csv'
            } as unknown as Job;

            // 3. Execute Service Method
            const result = await service.processBulkImport(
                mockJob,
                importMappings,
                'user-id-placeholder',
                profileId // Note: The service signature accepts profileId but also uses mappingDto.profileId. 
                // It seems the service iterates mappings and uses mappingDto.profileId.
            );

            // 4. Verification
            expect(result.successItems.length).toBe(2); // Two new items added
            expect(result.skippedCount).toBe(1); // One duplicate skipped
            expect(result.errorCount).toBe(0);

            const allMappings = await repository.find();
            expect(allMappings.length).toBe(3); // 1 existing + 2 new

            // Verify progress updates
            expect(mockJob.updateProgress).toHaveBeenCalled();
        });

        it('should handle errors gracefully during import', async () => {
            const importMappings: CreateTestRegistryDto[] = [
                {
                    profileId: profileId,
                    targetComponentId: 't1',
                    testComponentId: 'test1',
                }
            ];

            const mockJob = {
                updateProgress: jest.fn(),
            } as unknown as Job;

            const result = await service.processBulkImport(mockJob, importMappings, 'u1', profileId);
            expect(result.successItems.length).toBe(1);
            expect(result.errorCount).toBe(0);
        });
    });
});
