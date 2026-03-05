import { Controller, Post, Get, HttpCode, HttpStatus, Logger, HttpException, Body } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constants';

@Controller('system/sync')
export class DiscoveryController {
    private readonly logger = new Logger(DiscoveryController.name);

    constructor(private readonly discoveryService: DiscoveryService) { }

    @Get('active')
    @RequirePermission(PERMISSIONS.DISCOVERY_VIEW)
    async checkActiveSync() {
        const syncStatus = await this.discoveryService.isSyncActive();
        return {
            isRunning: syncStatus.active,
            progress: syncStatus.progress,
            totalCount: syncStatus.totalCount
        };
    }

    @Post()
    @HttpCode(HttpStatus.ACCEPTED)
    @RequirePermission(PERMISSIONS.DISCOVERY_SYNC)
    async triggerSync(@Body() body: { environmentId?: string }) {
        this.logger.log('Manual sync triggered via API, enqueueing job.');
        try {
            const syncStatus = await this.discoveryService.isSyncActive();
            if (syncStatus.active) {
                return {
                    message: 'Synchronization is already active',
                };
            }

            const result = await this.discoveryService.enqueueSyncJob(body?.environmentId);
            return {
                message: 'Synchronization job enqueued successfully',
                data: result,
            };
        } catch (error: any) {
            const statusCode = error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
            let message = error?.message || 'Internal server error';

            throw new HttpException(message, statusCode);
        }
    }

    @Get()
    @RequirePermission(PERMISSIONS.DISCOVERY_VIEW)
    async getSyncStatus() {
        return this.discoveryService.getLastSyncStatus();
    }
}
