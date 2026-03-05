import { Controller, Get, Query, ParseBoolPipe, DefaultValuePipe, BadRequestException } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { ComponentTreeNode } from './interfaces/component-tree-node.interface';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constants';

@Controller('discovery/components')
export class DiscoveryComponentsController {
    constructor(private readonly discoveryService: DiscoveryService) { }

    @Get()
    @RequirePermission(PERMISSIONS.DISCOVERY_VIEW)
    async getComponentsTree(
        @Query('profileId') profileId: string,
        @Query('isTest', new ParseBoolPipe({ optional: true })) isTest?: boolean,
        @Query('search') search?: string,
    ): Promise<{ data: ComponentTreeNode[] }> {
        if (!profileId) {
            throw new BadRequestException('profileId should not be empty');
        }
        const tree = await this.discoveryService.getComponentsTree({ profileId, isTest, search });
        return { data: tree };
    }
}
