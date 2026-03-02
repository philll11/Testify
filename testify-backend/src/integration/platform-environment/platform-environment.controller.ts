import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PlatformEnvironmentService } from './platform-environment.service';
import { IntegrationService } from '../integration.service';
import { CreatePlatformEnvironmentDto } from './dto/create-platform-environment.dto';
import { UpdatePlatformEnvironmentDto } from './dto/update-platform-environment.dto';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions.constants';

@Controller('platform-environments')
export class PlatformEnvironmentController {
  constructor(
    private readonly platformEnvironmentService: PlatformEnvironmentService,
    @Inject(forwardRef(() => IntegrationService))
    private readonly integrationService: IntegrationService,
  ) { }

  @Post(':id/test-connection')
  @RequirePermission(PERMISSIONS.PLATFORM_ENVIRONMENT_VIEW)
  async testConnection(@Param('id') id: string) {
    const success = await this.integrationService.testConnection(id);
    if (!success) {
      return { success: false, message: 'Connection failed. Please check credentials and account ID.' };
    }
    return { success: true, message: 'Connection successful.' };
  }

  @Post()
  @RequirePermission(PERMISSIONS.PLATFORM_ENVIRONMENT_CREATE)
  create(@Body() createPlatformEnvironmentDto: CreatePlatformEnvironmentDto) {
    return this.platformEnvironmentService.create(createPlatformEnvironmentDto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.PLATFORM_ENVIRONMENT_VIEW)
  findAll() {
    return this.platformEnvironmentService.findAll();
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PLATFORM_ENVIRONMENT_VIEW)
  findOne(@Param('id') id: string) {
    return this.platformEnvironmentService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.PLATFORM_ENVIRONMENT_EDIT)
  update(
    @Param('id') id: string,
    @Body() updatePlatformEnvironmentDto: UpdatePlatformEnvironmentDto,
  ) {
    return this.platformEnvironmentService.update(
      id,
      updatePlatformEnvironmentDto,
    );
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.PLATFORM_ENVIRONMENT_DELETE)
  remove(@Param('id') id: string) {
    return this.platformEnvironmentService.remove(id);
  }
}
