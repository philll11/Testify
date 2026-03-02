import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PlatformEnvironmentService } from './platform-environment.service';
import { CreatePlatformEnvironmentDto } from './dto/create-platform-environment.dto';
import { UpdatePlatformEnvironmentDto } from './dto/update-platform-environment.dto';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions.constants';

@Controller('platform-environments')
export class PlatformEnvironmentController {
  constructor(
    private readonly platformEnvironmentService: PlatformEnvironmentService,
  ) {}

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
