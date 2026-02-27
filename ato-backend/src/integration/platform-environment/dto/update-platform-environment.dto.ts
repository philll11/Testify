import { PartialType } from '@nestjs/mapped-types';
import { CreatePlatformEnvironmentDto } from './create-platform-environment.dto';

export class UpdatePlatformEnvironmentDto extends PartialType(
  CreatePlatformEnvironmentDto,
) {}
