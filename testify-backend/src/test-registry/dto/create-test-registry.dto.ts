import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateTestRegistryDto {
    @IsUUID()
    @IsNotEmpty()
    readonly profileId: string;

    @IsString()
    @IsNotEmpty()
    readonly targetComponentId: string;

    @IsString()
    @IsOptional()
    readonly targetComponentName?: string;

    @IsString()
    @IsOptional()
    readonly targetComponentPath?: string;

    @IsString()
    @IsNotEmpty()
    readonly testComponentId: string;

    @IsString()
    @IsOptional()
    readonly testComponentName?: string;

    @IsString()
    @IsOptional()
    readonly testComponentPath?: string;

    @IsUUID()
    @IsOptional()
    readonly environmentId?: string;

    @IsBoolean()
    @IsOptional()
    readonly isActive?: boolean;
}