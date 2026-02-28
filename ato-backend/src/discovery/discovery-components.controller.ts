import { Controller, Get, Query } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { GetDiscoveryComponentsDto } from './dto/get-discovery-components.dto';
import { ComponentTreeNode } from './interfaces/component-tree-node.interface';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constants';

@Controller('discovery/components')
export class DiscoveryComponentsController {
    constructor(private readonly discoveryService: DiscoveryService) { }

    @Get()
    @RequirePermission(PERMISSIONS.DISCOVERY_VIEW)
    async getComponentsTree(@Query() queryDto: GetDiscoveryComponentsDto): Promise<{ data: ComponentTreeNode[] }> {
        const tree = await this.discoveryService.getComponentsTree(queryDto);
        return { data: tree };
    }
}
