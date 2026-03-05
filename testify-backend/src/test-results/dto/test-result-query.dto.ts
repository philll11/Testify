import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { TestResultStatus } from '../entities/test-result.entity';

export class TestResultQueryDto {
    @IsOptional()
    @IsUUID()
    collectionId?: string;

    @IsOptional()
    @IsEnum(TestResultStatus)
    status?: TestResultStatus;
}
