// backend/src/users/dto/query-user.dto.ts
import { IsBoolean, IsEnum, IsOptional, IsString, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryUserDto {

    @IsString()
    @IsOptional()
    readonly recordId?: string;

    @IsString()
    @IsOptional()
    readonly name?: string;

    @IsEmail()
    @IsOptional()
    readonly email?: string;

    @IsOptional()
    @IsString()
    readonly roleId?: string;

    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    readonly isDeleted?: boolean;

    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    readonly includeInactives?: boolean;

    @IsOptional()
    @IsString()
    readonly updatedAfter?: string; // ISO Date String
}