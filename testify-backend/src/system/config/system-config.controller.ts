import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SystemConfigService } from './system-config.service';
import { JwtAuthGuard } from '../../iam/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions.constants';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';
import { SystemConfigKeys } from '../../common/constants/system-config.constants';
import { UpdateDiscoveryConfigDto } from './dto/update-discovery-config.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PlatformEnvironmentService } from '../../integration/platform-environment/platform-environment.service';

@Controller('system/config')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SystemConfigController {
  constructor(
    private readonly systemConfigService: SystemConfigService,
    private readonly platformEnvironmentService: PlatformEnvironmentService, private readonly eventEmitter: EventEmitter2,) { }

  @Get()
  @RequirePermission(PERMISSIONS.SYSTEM_CONFIG_VIEW)
  async findAll() {
    return this.systemConfigService.getAll();
  }

  @Get(':key')
  @RequirePermission(PERMISSIONS.SYSTEM_CONFIG_VIEW)
  async findOne(@Param('key') key: string) {
    return this.systemConfigService.get(key);
  }

  @Patch(':key')
  @RequirePermission(PERMISSIONS.SYSTEM_CONFIG_EDIT)
  async update(
    @Param('key') key: string,
    @Body() updateSystemConfigDto: UpdateSystemConfigDto,
  ) {
    if (key === SystemConfigKeys.DISCOVERY.CONFIG) {
      const discoveryConfigDto = plainToInstance(
        UpdateDiscoveryConfigDto,
        updateSystemConfigDto.value,
      );
      const errors = await validate(discoveryConfigDto);
      if (errors.length > 0) {
        throw new BadRequestException(errors);
      }

      // Update the default environment flag on the PlatformEnvironment entity
      const defaultEnvId = discoveryConfigDto.defaultSyncEnvironmentId || null;
      await this.platformEnvironmentService.setDefaultEnvironment(defaultEnvId);
    }

    await this.systemConfigService.set(key, updateSystemConfigDto.value);

    if (key === SystemConfigKeys.DISCOVERY.CONFIG) {
      this.eventEmitter.emit('discovery.config.updated');
    }

    return { success: true };
  }
}
