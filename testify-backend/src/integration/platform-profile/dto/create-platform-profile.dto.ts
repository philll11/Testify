import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { IntegrationPlatform } from '../../constants/integration-platform.enum';

export class CreatePlatformProfileDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  accountId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(IntegrationPlatform)
  platformType: IntegrationPlatform;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
