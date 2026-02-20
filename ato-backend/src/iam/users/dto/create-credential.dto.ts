import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IntegrationPlatform } from '../entities/user-integration-credential.entity';

export class CreateCredentialDto {
    @IsEnum(IntegrationPlatform)
    @IsOptional()
    platform: IntegrationPlatform;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    profileName: string;

    @IsString()
    @IsNotEmpty()
    accountId: string;

    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    passwordOrToken: string;

    @IsString()
    @IsOptional()
    executionInstanceId?: string;
}
