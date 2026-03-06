import { IsArray, ValidateNested, ArrayNotEmpty, IsUUID, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTestRegistryDto } from './create-test-registry.dto';

export class ImportTestRegistryDto {
    @IsUUID()
    @IsNotEmpty()
    readonly environmentId: string;

    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => CreateTestRegistryDto)
    readonly mappings: CreateTestRegistryDto[];
}
