// backend/src/roles/roles.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';

import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../../common/constants/permissions.constants';

import { UsersService } from '../users/users.service';
import { QueryUserDto } from '../users/dto/query-user.dto';
import { User } from '../users/entities/user.entity';

@Controller('roles')
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly usersService: UsersService,
  ) { }

  @Post()
  @RequirePermission(PERMISSIONS.ROLE_CREATE)
  create(@Body() createRoleDto: CreateRoleDto, @CurrentUser() requestingUser: User) {
    return this.rolesService.create(createRoleDto, requestingUser);
  }

  @Get()
  @RequirePermission(PERMISSIONS.ROLE_VIEW)
  findAll(@Query() query: QueryRoleDto, @CurrentUser() requestingUser: User) {
    return this.rolesService.findAll(query, requestingUser);
  }

  @Get(':roleId')
  @RequirePermission(PERMISSIONS.ROLE_VIEW)
  findOne(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Query() query: QueryRoleDto,
    @CurrentUser() requestingUser: User
  ) {
    return this.rolesService.findOne(roleId, requestingUser, { includeInactive: query.includeInactives });
  }

  @Get(':roleId/users')
  @RequirePermission(PERMISSIONS.ROLE_VIEW)
  async findAllUsersForRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Query() query: QueryUserDto,
    @CurrentUser() requestingUser: User,
  ) {
    await this.rolesService.findOne(roleId, requestingUser); // Secure check
    // Adapter: Call generic findAll with roleId filter
    return this.usersService.findAll({ ...query, roleId }, requestingUser);
  }

  @Patch(':roleId')
  @RequirePermission(PERMISSIONS.ROLE_EDIT)
  update(@Param('roleId', ParseUUIDPipe) roleId: string, @Body() updateRoleDto: UpdateRoleDto, @CurrentUser() requestingUser: User) {
    return this.rolesService.update(roleId, updateRoleDto, requestingUser);
  }

  @Delete(':roleId')
  @RequirePermission(PERMISSIONS.ROLE_DELETE)
  remove(@Param('roleId', ParseUUIDPipe) roleId: string, @CurrentUser() requestingUser: User) {
    return this.rolesService.remove(roleId, requestingUser);
  }
}