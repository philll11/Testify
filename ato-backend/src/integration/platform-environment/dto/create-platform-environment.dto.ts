import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsObject,
    IsUUID,
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

    @IsObject()
    @IsNotEmpty()
    credentials: Record<string, any>;
}
