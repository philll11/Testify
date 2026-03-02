import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateTestRegistryDto {
    @IsString()
    @IsNotEmpty()
    readonly targetComponentId: string;

    @IsString()
    @IsNotEmpty()
    readonly testComponentId: string;

    @IsBoolean()
    @IsOptional()
    readonly isActive?: boolean;
}