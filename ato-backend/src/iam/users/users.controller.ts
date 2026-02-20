// backend/src/users/users.controller.ts
import { Controller, Get, Query, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { QueryUserDto } from './dto/query-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../../common/constants/permissions.constants';

import { User } from './entities/user.entity';


@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @RequirePermission(PERMISSIONS.USER_CREATE)
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() requestingUser: User) {
    return this.usersService.create(createUserDto, requestingUser);
  }

  @Post('credentials')
  createCredential(@Body() createCredentialDto: CreateCredentialDto, @CurrentUser() requestingUser: User) {
    return this.usersService.createCredential(createCredentialDto, requestingUser);
  }

  @Get()
  @RequirePermission(PERMISSIONS.USER_VIEW)
  findAll(@Query() query: QueryUserDto, @CurrentUser() requestingUser: User) {
    return this.usersService.findAll(query, requestingUser);
  }

  @Get(':userId')
  @RequirePermission(PERMISSIONS.USER_VIEW)
  findOne(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: QueryUserDto,
    @CurrentUser() requestingUser: User
  ) {
    return this.usersService.findOne(userId, requestingUser, { includeInactive: query.includeInactives });
  }

  @Patch(':userId')
  // @RequirePermission(PERMISSIONS.USER_EDIT) - Logic moved to Service to allow self-service
  update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() requestingUser: User,
  ) {
    return this.usersService.update(userId, updateUserDto, requestingUser);
  }

  @Delete(':userId')
  @RequirePermission(PERMISSIONS.USER_DELETE)
  remove(@Param('userId', ParseUUIDPipe) userId: string, @CurrentUser() requestingUser: User) {
    return this.usersService.remove(userId, requestingUser);
  }
}