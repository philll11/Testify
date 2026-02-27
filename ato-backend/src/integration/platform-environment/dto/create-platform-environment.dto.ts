import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class CreatePlatformEnvironmentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  @IsNotEmpty()
  profileId: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsObject()
  @IsNotEmpty()
  credentials: Record<string, any>;
}
