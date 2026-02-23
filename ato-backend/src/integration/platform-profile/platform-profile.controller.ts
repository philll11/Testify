import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PlatformProfileService } from './platform-profile.service';
import { CreatePlatformProfileDto } from './dto/create-platform-profile.dto';
import { UpdatePlatformProfileDto } from './dto/update-platform-profile.dto';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions.constants';

@Controller('platform-profiles')
export class PlatformProfileController {
  constructor(
    private readonly platformProfileService: PlatformProfileService,
  ) {}

  @Post()
  @RequirePermission(PERMISSIONS.PLATFORM_PROFILE_CREATE)
  create(@Body() createPlatformProfileDto: CreatePlatformProfileDto) {
    return this.platformProfileService.create(createPlatformProfileDto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.PLATFORM_PROFILE_VIEW)
  findAll() {
    return this.platformProfileService.findAll();
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PLATFORM_PROFILE_VIEW)
  findOne(@Param('id') id: string) {
    return this.platformProfileService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.PLATFORM_PROFILE_EDIT)
  update(
    @Param('id') id: string,
    @Body() updatePlatformProfileDto: UpdatePlatformProfileDto,
  ) {
    return this.platformProfileService.update(id, updatePlatformProfileDto);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.PLATFORM_PROFILE_DELETE)
  remove(@Param('id') id: string) {
    return this.platformProfileService.remove(id);
  }
}
