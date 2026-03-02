import { Controller, Post, Get, HttpCode, HttpStatus, Logger, HttpException } from '@nestjs/common';
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
        try {
            const result = await this.discoveryService.syncDatabase();
            return {
                message: 'Synchronization successful',
                data: result,
            };
        } catch (error: any) {
            const statusCode = error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
            let message = error?.message || 'Internal server error';

            if (statusCode === 401) {
                message = 'Authentication failed. Please verify the environment credentials in Settings.';
            } else if (statusCode === 403) {
                message = 'Access denied (403). The provided credentials do not have permission to perform this action.';
            } else if (statusCode === 404) {
                message = 'Integration endpoint not found (404). Please verify Account/Atom configuration.';
            }

            throw new HttpException(message, statusCode);
        }
    }

    @Get()
    @RequirePermission(PERMISSIONS.DISCOVERY_VIEW)
    async getSyncStatus() {
        return this.discoveryService.getLastSyncStatus();
    }
}
