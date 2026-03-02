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
  HttpException,
  HttpStatus,
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
    try {
      const success = await this.integrationService.testConnection(id);
      return { success: true, message: 'Connection successful.' };
    } catch (error: any) {
      const statusCode = error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      let message = error?.message || 'Connection failed. Please check credentials and account ID.';

      if (statusCode === 401) {
        message = 'Authentication failed. Please verify the environment credentials.';
      } else if (statusCode === 403) {
        message = 'Access denied (403). The provided credentials do not have permission.';
      } else if (statusCode === 404) {
        message = 'Integration endpoint not found (404). Please verify Account/Atom configuration.';
      }

      throw new HttpException(message, statusCode);
    }
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
