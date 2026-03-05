import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class ExecuteCollectionDto {
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    testsToRun?: string[];

    @IsUUID()
    environmentId: string;
}
