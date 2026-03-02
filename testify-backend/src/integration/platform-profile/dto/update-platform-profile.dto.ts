import { PartialType } from '@nestjs/mapped-types';
import { CreatePlatformProfileDto } from './create-platform-profile.dto';

export class UpdatePlatformProfileDto extends PartialType(
  CreatePlatformProfileDto,
) {}
