import { Controller, Post, Body, Get, Param, ParseUUIDPipe, Delete } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { ExecuteCollectionDto } from './dto/execute-collection.dto';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constants';
import { User } from '../iam/users/entities/user.entity';

@Controller('collections')
export class CollectionsController {
    constructor(private readonly collectionsService: CollectionsService) { }

    @Post()
    @RequirePermission(PERMISSIONS.COLLECTION_CREATE)
    create(
        @Body() createCollectionDto: CreateCollectionDto,
        @CurrentUser() requestingUser: User,
    ) {
        return this.collectionsService.create(createCollectionDto, requestingUser);
    }

    @Get()
    @RequirePermission(PERMISSIONS.COLLECTION_VIEW)
    findAll() {
        return this.collectionsService.findAll();
    }

    @Get(':id')
    @RequirePermission(PERMISSIONS.COLLECTION_VIEW)
    findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() requestingUser: User,
    ) {
        return this.collectionsService.findOne(id, requestingUser);
    }

    @Post(':id/execute')
    @RequirePermission(PERMISSIONS.COLLECTION_CREATE)
    execute(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() executeDto: ExecuteCollectionDto,
        @CurrentUser() requestingUser: User,
    ) {
        return this.collectionsService.execute(id, executeDto, requestingUser);
    }

    @Delete(':id')
    @RequirePermission(PERMISSIONS.COLLECTION_DELETE)
    remove(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() requestingUser: User,
    ) {
        return this.collectionsService.remove(id, requestingUser);
    }
}

