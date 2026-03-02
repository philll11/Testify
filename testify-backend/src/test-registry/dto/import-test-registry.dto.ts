import { IsArray, ValidateNested, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTestRegistryDto } from './create-test-registry.dto';

export class ImportTestRegistryDto {
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => CreateTestRegistryDto)
    readonly mappings: CreateTestRegistryDto[];
}
