import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { BoomiComponentType } from '../../../integration/boomi/constants/boomi-component-type.enum';

export class UpdateDiscoveryConfigDto {
  @IsArray()
  @IsEnum(BoomiComponentType, { each: true })
  componentTypes: BoomiComponentType[];

  @IsOptional()
  @IsString()
  testDirectoryFolderName: string | null;

  @IsOptional()
  @IsUUID()
  defaultSyncEnvironmentId: string | null;

  @IsString()
  syncScheduleCron: string;
}
