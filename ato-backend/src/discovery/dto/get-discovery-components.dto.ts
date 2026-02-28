import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetDiscoveryComponentsDto {
    @IsNotEmpty()
    @IsString()
    profileId: string;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    isTest?: boolean;

    @IsOptional()
    @IsString()
    search?: string;
}
