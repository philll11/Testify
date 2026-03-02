import { Controller, Post, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constants';

@Controller('system/sync')
export class DiscoveryController {
    private readonly logger = new Logger(DiscoveryController.name);

    constructor(private readonly discoveryService: DiscoveryService) { }

    @Post()
    @HttpCode(HttpStatus.OK)
    @RequirePermission(PERMISSIONS.DISCOVERY_SYNC)
    async triggerSync() {
        this.logger.log('Manual sync triggered via API.');
        const result = await this.discoveryService.syncDatabase();
        return {
            message: 'Synchronization successful',
            data: result,
        };
    }

    @Get()
    @RequirePermission(PERMISSIONS.DISCOVERY_VIEW)
    async getSyncStatus() {
        return this.discoveryService.getLastSyncStatus();
    }
}
