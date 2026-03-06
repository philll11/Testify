import { Controller, Get, Post, Body, Param, Patch, Delete, ParseUUIDPipe, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TestRegistryService } from './test-registry.service';
import { CreateTestRegistryDto } from './dto/create-test-registry.dto';
import { UpdateTestRegistryDto } from './dto/update-test-registry.dto';
import { ImportTestRegistryDto } from './dto/import-test-registry.dto';

import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constants';
import { User } from '../iam/users/entities/user.entity';

@Controller('test-registry')
export class TestRegistryController {
    constructor(
        private readonly testRegistryService: TestRegistryService,
        @InjectQueue('test-registry-tasks') private readonly tasksQueue: Queue
    ) { }

    /**
     * Creates a new mapping between a target component and a test component.
     */
    @Post()
    @RequirePermission(PERMISSIONS.TEST_REGISTRY_CREATE)
    async create(
        @Body() createTestRegistryDto: CreateTestRegistryDto,
        @CurrentUser() requestingUser: User
    ) {
        const saved = await this.testRegistryService.create(createTestRegistryDto, requestingUser);

        if (createTestRegistryDto.environmentId) {
            await this.tasksQueue.add('fetch_metadata', {
                id: saved.id,
                targetComponentId: saved.targetComponentId,
                testComponentId: saved.testComponentId,
                environmentId: createTestRegistryDto.environmentId
            });
        }

        return saved;
    }

    /**
     * Retrieves a list of all existing mappings.
     */
    @Get()
    @RequirePermission(PERMISSIONS.TEST_REGISTRY_VIEW)
    findAll(@Query('profileId', new ParseUUIDPipe({ optional: true })) profileId?: string) {
        return this.testRegistryService.findAll(profileId);
    }

    /**
     * Retrieves test mappings for a specific target component.
     */
    @Get('target/:targetId')
    @RequirePermission(PERMISSIONS.TEST_REGISTRY_VIEW)
    findByTarget(@Param('targetId') targetId: string) {
        return this.testRegistryService.findByTargetComponent(targetId);
    }

    /**
     * Get job status for import and fetch_metadata tasks on test-registry queue
     */
    @Get('job/:id')
    @RequirePermission(PERMISSIONS.TEST_REGISTRY_VIEW)
    async getJobStatus(@Param('id') id: string) {
        const job = await this.tasksQueue.getJob(id);
        if (!job) return { status: 'not_found' };
        return {
            id: job.id,
            name: job.name,
            status: await job.getState(),
            progress: job.progress,
            failedReason: job.failedReason,
            finishedOn: job.finishedOn,
            processedOn: job.processedOn,
        };
    }

    /**
     * Retrieves a specific test mapping by its ID.
     */
    @Get(':registryId')
    @RequirePermission(PERMISSIONS.TEST_REGISTRY_VIEW)
    findOne(@Param('registryId', ParseUUIDPipe) registryId: string) {
        return this.testRegistryService.findOne(registryId);
    }

    /**
     * Updates an existing mapping between a target component and a test component.
     */
    @Patch(':registryId')
    @RequirePermission(PERMISSIONS.TEST_REGISTRY_EDIT)
    update(
        @Param('registryId', ParseUUIDPipe) registryId: string,
        @Body() updateTestRegistryDto: UpdateTestRegistryDto,
        @CurrentUser() requestingUser: User
    ) {
        return this.testRegistryService.update(registryId, updateTestRegistryDto, requestingUser);
    }

    /**
     * Deletes a specific mapping by its unique registry ID.
     */
    @Delete(':registryId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequirePermission(PERMISSIONS.TEST_REGISTRY_DELETE)
    remove(
        @Param('registryId', ParseUUIDPipe) registryId: string,
        @CurrentUser() requestingUser: User
    ) {
        return this.testRegistryService.remove(registryId, requestingUser);
    }

    /**
     * Bulk imports multiple mappings for ease of setup.
     */
    @Post('import')
    @RequirePermission(PERMISSIONS.TEST_REGISTRY_IMPORT)
    async bulkImport(
        @Body() importDto: ImportTestRegistryDto,
        @CurrentUser() requestingUser: User
    ) {
        const job = await this.tasksQueue.add('import_csv', {
            mappings: importDto.mappings,
            requestingUserId: requestingUser.id,
            environmentId: importDto.environmentId,
        });
        return { message: 'Import job enqueued', jobId: job.id };
    }
}


