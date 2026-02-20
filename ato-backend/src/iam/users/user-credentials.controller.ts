import { Controller, Get, Post, Body, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { CredentialResponseDto } from './dto/credential-response.dto';
import { UserCredentialsService } from './user-credentials.service';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users/me/credentials')
export class UserCredentialsController {
    constructor(private readonly credentialsService: UserCredentialsService) { }

    @Post()
    async create(
        @CurrentUser('id') userId: string,
        @Body() dto: CreateCredentialDto,
    ): Promise<CredentialResponseDto> {
        return this.credentialsService.create(userId, dto);
    }

    @Get()
    async findAll(@CurrentUser('id') userId: string): Promise<CredentialResponseDto[]> {
        return this.credentialsService.findAll(userId);
    }

    @Delete(':id')
    async remove(
        @CurrentUser('id') userId: string,
        @Param('id') id: string,
    ): Promise<void> {
        return this.credentialsService.remove(userId, id);
    }
}
