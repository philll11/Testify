// backend/src/users/dto/create-user.dto.ts
import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { IsExistingRole } from '../../roles/decorators/is-existing-role.decorator';
import { UserPreferencesDto } from './user-preferences.dto';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  readonly firstName: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  readonly lastName: string;

  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  readonly email: string;

  @IsString()
  @IsOptional()
  readonly password?: string;

  @IsUUID()
  @IsExistingRole()
  @IsOptional()
  readonly roleId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserPreferencesDto)
  readonly preferences?: UserPreferencesDto;
}
