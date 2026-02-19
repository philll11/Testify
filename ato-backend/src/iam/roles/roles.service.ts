import { Injectable, NotFoundException, ConflictException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike, FindOptionsWhere } from 'typeorm';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { Role } from './entities/role.entity';

import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { CountersService } from '../../system/counters/counters.service';
import { PERMISSIONS } from '../../common/constants/permissions.constants';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService,
    private readonly countersService: CountersService,
  ) { }

  async create(createRoleDto: CreateRoleDto, requestingUser: User): Promise<Role> {
    const { prefix, sequence_value } = await this.countersService.getNextSequenceValue('role', 'ROL');
    const paddedSequence = sequence_value.toString().padStart(4, '0');
    const recordId = `${prefix}${paddedSequence}`;

    const newRole = this.roleRepository.create({
      name: createRoleDto.name,
      description: createRoleDto.description,
      permissions: createRoleDto.permissions || [],
      recordId
    });

    return this.roleRepository.save(newRole);
  }

  async findAll(query: QueryRoleDto, requestingUser: User): Promise<Role[]> {
    const where: FindOptionsWhere<Role> = {};

    // 1. Handle Deleted Records
    // Default: Filter OUT deleted records
    // If specific request AND permission: Filter IN deleted records
    if (query.isDeleted === true) {
      const userPermissions = requestingUser.role?.permissions || [];
      if (!userPermissions.includes(PERMISSIONS.VIEW_DELETED)) {
        throw new ForbiddenException('You do not have permission to view deleted records.');
      }
      where.isDeleted = true;
    } else {
      where.isDeleted = false;
    }

    // 2. Handle Inactive Records
    // Default: Filter OUT inactive records (Active Only)
    // If specific request AND permission: Include inactive (All)
    const includeInactives = query.includeInactives === true;
    if (!includeInactives) {
      // By default, we only want active records
      where.isActive = true;
    } else {
      // User wants all records (Active + Inactive).
      // Check if they have permission to see inactives.
      const userPermissions = requestingUser.role?.permissions || [];
      const canManageInactives = userPermissions.includes(PERMISSIONS.ROLE_MANAGE_INACTIVE);

      if (!canManageInactives) {
        // If they don't have permission, ignore the flag and enforce Active Only
        where.isActive = true;
      }
      // If they DO have permission, we don't set isActive, returning both true and false.
    }

    // 3. Common Filters
    if (query.name) {
      where.name = ILike(`%${query.name}%`);
    }

    if (query.recordId) {
      where.recordId = ILike(`%${query.recordId}%`);
    }

    return this.roleRepository.find({
      where,
      order: { name: 'ASC' } // Default sort
    });
  }

  async findOne(roleId: string, requestingUser: User, options: { includeInactive?: boolean } = {}): Promise<Role> {
    const where: FindOptionsWhere<Role> = { id: roleId };

    // Default behavior for deleted records
    where.isDeleted = false;

    // Handle includeInactive option
    if (!options.includeInactive) {
      where.isActive = true;
    }

    const role = await this.roleRepository.findOne({ where });

    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" not found.`);
    }
    return role;
  }

  async update(roleId: string, updateRoleDto: UpdateRoleDto, requestingUser: User): Promise<Role> {
    const existingRole = await this.findOne(roleId, requestingUser, { includeInactive: true });

    const { isActive, ...restOfDto } = updateRoleDto;

    // Direct properties
    this.roleRepository.merge(existingRole, restOfDto);

    if (isActive !== undefined && isActive !== existingRole.isActive) {
      const userPermissions = requestingUser.role?.permissions || [];
      if (!userPermissions.includes(PERMISSIONS.ROLE_MANAGE_INACTIVE)) {
        throw new ForbiddenException('You do not have permission to change the isActive status of a role.');
      }

      if (isActive === false) {
        const activeUserCount = await this.usersService.countActiveByRoleId(roleId);
        if (activeUserCount > 0) {
          throw new ConflictException(`This role cannot be deactivated because it has ${activeUserCount} active user(s) assigned to it. Please reassign the users first.`);
        }
      }
      existingRole.isActive = isActive;
    }

    return await this.roleRepository.save(existingRole);
  }

  async remove(roleId: string, requestingUser: User): Promise<Role> {
    await this.findOne(roleId, requestingUser);

    const activeUsers = await this.userRepository.find({
      where: { role: { id: roleId }, isDeleted: false },
      select: ['id', 'recordId', 'firstName', 'lastName'] as any
    });

    if (activeUsers.length > 0) {
      throw new ConflictException({
        message: `Cannot delete Role. Assigned to one or more Users.`,
        blockingResources: activeUsers.map(u => ({
          _id: u.id,
          recordId: u.recordId,
          name: `${u.firstName} ${u.lastName}`
        }))
      });
    }

    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    role.isDeleted = true;
    return await this.roleRepository.save(role);
  }

  async isRoleExistingAndActive(roleId: string): Promise<boolean> {
    const count = await this.roleRepository.count({ where: { id: roleId, isDeleted: false, isActive: true } });
    return count > 0;
  }

}
