import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCredentialDto {
    @IsString()
    @IsOptional()
    @MaxLength(100)
    platform: string;

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
