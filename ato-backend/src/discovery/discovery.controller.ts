import { Controller, Post, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constants';

@ApiTags('System')
@ApiBearerAuth()
@Controller('system/sync')
export class DiscoveryController {
    private readonly logger = new Logger(DiscoveryController.name);

    constructor(private readonly discoveryService: DiscoveryService) { }

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Manually trigger a State of the World synchronization' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Synchronization completed successfully' })
    @RequirePermission(PERMISSIONS.SYSTEM_CONFIG_EDIT)
    async triggerSync() {
        this.logger.log('Manual sync triggered via API.');
        const result = await this.discoveryService.syncDatabase();
        return {
            message: 'Synchronization successful',
            data: result,
        };
    }
}
