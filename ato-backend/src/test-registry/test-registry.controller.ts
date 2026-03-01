import { Controller, Get, Post, Body, Param, Delete, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { TestRegistryService } from './test-registry.service';
import { CreateTestRegistryDto } from './dto/create-test-registry.dto';
import { ImportTestRegistryDto } from './dto/import-test-registry.dto';

import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constants';
import { User } from '../iam/users/entities/user.entity';

@Controller('test-registry')
export class TestRegistryController {
    constructor(private readonly testRegistryService: TestRegistryService) { }

    /**
     * Creates a new mapping between a target component and a test component.
     */
    @Post()
    @RequirePermission(PERMISSIONS.TEST_REGISTRY_CREATE)
    create(
        @Body() createTestRegistryDto: CreateTestRegistryDto,
        @CurrentUser() requestingUser: User
    ) {
        return this.testRegistryService.create(createTestRegistryDto, requestingUser);
    }

    /**
     * Retrieves a list of all existing mappings.
     */
    @Get()
    @RequirePermission(PERMISSIONS.TEST_REGISTRY_VIEW)
    findAll() {
        return this.testRegistryService.findAll();
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
    bulkImport(
        @Body() importDto: ImportTestRegistryDto,
        @CurrentUser() requestingUser: User
    ) {
        return this.testRegistryService.bulkImport(importDto.mappings, requestingUser);
    }
}

