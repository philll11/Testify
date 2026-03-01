import { IsString, IsEnum, IsUUID, IsOptional, IsArray, ArrayNotEmpty } from 'class-validator';
import { CollectionType } from '../enums/collection.enums';

export class CreateCollectionDto {
    @IsString()
    name: string;

    @IsEnum(CollectionType)
    collectionType: CollectionType;

    @IsUUID()
    @IsOptional()
    environmentId?: string;

    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    componentIds: string[];
}
