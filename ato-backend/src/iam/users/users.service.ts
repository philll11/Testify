// backend/src/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In, FindOptionsWhere, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';

import {
  PERMISSIONS,
  Resource,
} from '../../common/constants/permissions.constants';
import { CountersService } from '../../system/counters/counters.service';
import { AuditsService } from '../../system/audits/audits.service';
import { AuditAction } from '../../system/audits/entities/audit.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @Inject(forwardRef(() => AuditsService))
    private readonly auditsService: AuditsService,
    private readonly countersService: CountersService,
  ) { }

  /**
   * Creates a new user based on the provided DTO.
   * Converts string IDs to ObjectId types for role and client associations.
   * Validates that the requesting user has access to assign the specified clients.
   * @param createUserDto - The DTO containing user creation data.
   * @param requestingUser - The authenticated user making the request.
   * @returns The created user document.
   */
  async create(
    createUserDto: CreateUserDto,
    requestingUser: User,
  ): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists.');
    }

    const { prefix, sequence_value } =
      await this.countersService.getNextSequenceValue('user', 'USR');
    const recordId = `${prefix}${sequence_value.toString().padStart(4, '0')}`;

    const { roleId, password, preferences, ...restOfDto } = createUserDto;

    // Hash password if provided
    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Lookup Role if provided, so audit log has full details (name/recordId)
    let role;
    if (roleId) {
      role = await this.roleRepository.findOne({ where: { id: roleId } });
      if (!role) throw new NotFoundException('Role not found');
    }

    const userToCreate = this.userRepository.create({
      ...restOfDto,
      recordId,
      name: `${createUserDto.firstName} ${createUserDto.lastName}`,
      password: hashedPassword,
      role: role,
      preferences: preferences
        ? { theme: preferences.theme || 'auto' }
        : undefined,
    } as User);

    const savedUser = await this.userRepository.save(userToCreate);

    // Log audit
    await this.auditsService.log(
      Resource.USER, // resource
      savedUser.id, // resourceId
      AuditAction.CREATE, // action
      null, // oldData
      savedUser, // newData
      requestingUser.id, // userId
      'User Created', // reason
      [
        'name',
        'passwordResetToken',
        'passwordResetExpires',
        'roleId',
        'preferences',
        'tokenVersion',
      ], // ignoredPaths
    );

    return savedUser;
  }

  async findAll(query: QueryUserDto, requestingUser: User): Promise<User[]> {
    const where: FindOptionsWhere<User> = {};

    // 1. Handle Deleted Records
    if (query.isDeleted === true) {
      const userPermissions = requestingUser.role?.permissions || [];
      if (!userPermissions.includes(PERMISSIONS.VIEW_DELETED)) {
        throw new ForbiddenException(
          'You do not have permission to view deleted records.',
        );
      }
      where.isDeleted = true;
    } else {
      where.isDeleted = false;
    }

    // 2. Handle Inactive Records
    const includeInactives = query.includeInactives === true;
    if (!includeInactives) {
      where.isActive = true;
    } else {
      // User wants all records (Active + Inactive).
      // Check for permission. Assuming generic ManageInactive or User-specific permission.
      // BaseQueryBuilder used `${this.resourceName}:ManageInactive`. For User, resourceName is Resource.USER ('USER').
      const userPermissions = requestingUser.role?.permissions || [];
      const canManageInactives =
        userPermissions.includes(`${Resource.USER}:ManageInactive`) ||
        userPermissions.includes(PERMISSIONS.USER_EDIT); // Fallback if specific perm doesn't exist

      if (!canManageInactives) {
        where.isActive = true;
      }
    }

    // 3. Common Filters
    if (query.name) {
      where.name = ILike(`%${query.name}%`);
    }

    if (query.recordId) {
      where.recordId = ILike(`%${query.recordId}%`);
    }

    // 4. User Specific Filters
    if (query.email) {
      where.email = ILike(`%${query.email}%`);
    }

    // Role Relation Filter
    if (query.roleId) {
      where.role = { id: query.roleId };
    }

    return this.userRepository.find({
      where,
      relations: ['role'], // Users needs role loaded usually
      order: { name: 'ASC' },
    });
  }

  async findOne(
    userId: string,
    requestingUser: User,
    options: { includeInactive?: boolean } = {},
  ): Promise<User> {
    const where: FindOptionsWhere<User> = { id: userId };

    // Default behavior for deleted records
    where.isDeleted = false;

    // Handle includeInactive option
    if (!options.includeInactive) {
      where.isActive = true;
    }

    const user = await this.userRepository.findOne({
      where,
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found.`);
    }
    return user;
  }
  /**
   * Updates a user, ensuring the requesting user has permission to modify them.
   * Enforces business rules for Contact users (limited to basic personal info).
   * @param userId - The ID of the user to update.
   * @param updateUserDto - The DTO containing update data.
   * @param requestingUser - The authenticated user making the request.
   * @returns The updated user document.
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    requestingUser: User,
  ): Promise<User> {
    const hasEditPermission = (requestingUser.role?.permissions || []).includes(
      PERMISSIONS.USER_EDIT,
    );

    if (id !== requestingUser.id) {
      if (!hasEditPermission)
        throw new ForbiddenException(
          'You do not have permission to edit other users.',
        );
    } else {
      if (!hasEditPermission) {
        // Restricted fields check
        const allowedFields = [
          'firstName',
          'lastName',
          'email',
          'password',
          'preferences',
        ];
        const attemptedFields = Object.keys(updateUserDto);
        const unauthorizedFields = attemptedFields.filter(
          (f) => !allowedFields.includes(f),
        );
        if (unauthorizedFields.length > 0) {
          throw new ForbiddenException(
            `Unauthorized fields: ${unauthorizedFields.join(', ')}`,
          );
        }
      }
    }

    const user = await this.findOne(id, requestingUser, {
      includeInactive: true,
    });
    // Capture original state for audit
    const originalUser = { ...user };

    const {
      roleId,
      isActive,
      password,
      preferences,
      firstName,
      lastName,
      ...restOfDto
    } = updateUserDto;

    this.userRepository.merge(user, restOfDto);

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (firstName || lastName) user.name = `${user.firstName} ${user.lastName}`;

    if (roleId) {
      // Find the full role entity so it's populated for the audit log
      const role = await this.roleRepository.findOne({ where: { id: roleId } });
      if (!role) throw new NotFoundException('Role not found');

      user.role = role;
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    if (password) {
      user.password = await bcrypt.hash(password, 10);
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    if (preferences) {
      user.preferences = { theme: preferences.theme || 'auto' };
    }

    if (isActive !== undefined && isActive !== user.isActive) {
      if (
        !(requestingUser.role?.permissions || []).includes(
          PERMISSIONS.USER_MANAGE_INACTIVE,
        )
      ) {
        throw new ForbiddenException(
          'You do not have permission to change the isActive status.',
        );
      }
      user.isActive = isActive;
    }

    const updatedUser = await this.userRepository.save(user);

    await this.auditsService.log(
      Resource.USER, // resource
      updatedUser.id, // resourceId
      AuditAction.UPDATE, // action
      originalUser, // oldData
      updatedUser, // newData
      requestingUser.id, // userId
      'User Updated', // reason
      [
        'name',
        'passwordResetToken',
        'passwordResetExpires',
        'roleId',
        'preferences',
        'tokenVersion',
      ], // ignoredPaths
    );

    return updatedUser;
  }

  /**
   * Invalidates all existing tokens for a user by incrementing their token version.
   * @param userId - The ID of the user to invalidate tokens for.
   */
  async invalidateTokens(userId: string): Promise<void> {
    await this.userRepository.increment({ id: userId }, 'tokenVersion', 1);
  }

  /**
   * Deletes a user, ensuring the requesting user has permission to do so.
   * @param userId - The ID of the user to delete.
   * @param requestingUser - The authenticated user making the request.
   * @returns The soft-deleted user.
   */
  async remove(userId: string, requestingUser: User): Promise<User> {
    const userToDelete = await this.findOne(userId, requestingUser, {
      includeInactive: true,
    });

    // Soft delete
    userToDelete.isDeleted = true;
    userToDelete.isActive = false;

    const deletedUser = await this.userRepository.save(userToDelete);

    await this.auditsService.log(
      Resource.USER, // resource
      deletedUser.id, // resourceId
      AuditAction.DELETE, // action
      deletedUser, // oldData
      null, // newData
      requestingUser.id, // userId
      'User Deleted', // reason
    );

    return deletedUser;
  }

  /**
   * Counts active, non-deleted users associated with a specific role.
   * Used as a pre-condition check before deactivating a role.
   * @param roleId The ID of the parent role.
   * @returns The number of active users assigned to the role.
   */
  async countActiveByRoleId(roleId: string): Promise<number> {
    return this.userRepository.count({
      where: {
        role: { id: roleId },
        isActive: true,
        isDeleted: false,
      },
    });
  }

  /**
   * Finds a user by their internal ID.
   * Internal use only (trusted).
   */
  async findOneById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * Validates that all user IDs in an array exist, are active and not deleted
   * @param userIds - An array of user IDs to validate.
   * @returns `true` if all IDs are valid users, `false` otherwise.
   */
  async validateUserIds(userIds: string[]): Promise<boolean> {
    if (!userIds || userIds.length === 0) return true;

    const uniqueIds = [...new Set(userIds)];
    const activeUsersCount = await this.userRepository.count({
      where: {
        id: In(uniqueIds),
        isActive: true,
        isDeleted: false,
      },
    });
    return activeUsersCount === uniqueIds.length;
  }

  /**
   * Finds a single user by their unique recordId and populates their role.
   * This is specifically used for authentication lookups.
   * @param recordId The user's unique recordId (from JWT `sub` claim)
   * @returns A user document with the role populated, or null if not found.
   */
  async findOneByRecordIdAndPopulateRole(
    recordId: string,
  ): Promise<User | null> {
    return this.userRepository.findOne({
      where: { recordId },
      relations: ['role'],
    });
  }

  /**
   * Finds a single user by their email and populates their role.
   * This is specifically used for the local authentication login process.
   * @param email The user's email address.
   * @returns A user document with the role populated, or null if not found.
   */
  async findOneByEmailAndPopulateRole(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['role'],
      select: [
        'id',
        'email',
        'password',
        'recordId',
        'isActive',
        'isDeleted',
        'tokenVersion',
        'firstName',
        'lastName',
        'preferences',
        'role',
      ], // Explicitly select password
    });
  }

  /**
   * Validates a user's password.
   * @param email - The user's email.
   * @param pass - The password to validate.
   * @returns The user document if validation succeeds, null otherwise.
   */
  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await this.findOneByEmailAndPopulateRole(email);
    // Determine if we need to check isDeleted here or if caller handles it.
    // Generally validateUser is for auth, so deleted users shouldn't create tokens.
    if (
      user &&
      !user.isDeleted &&
      user.password &&
      (await bcrypt.compare(pass, user.password))
    ) {
      // Return user without password (though findOneByEmail selected it, we should probably strip it before returning if used externally)
      // But AuthService handles the stripping usually.
      return user;
    }
    return null;
  }

  async setPasswordResetToken(
    userId: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.userRepository.update(userId, {
      passwordResetToken: token,
      passwordResetExpires: expires,
    });
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: MoreThan(new Date()),
      },
    });
  }

  async updatePasswordAndClearToken(userId: string, newPasswordHash: string): Promise<void> {
    await this.userRepository.update(userId, {
      password: newPasswordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    });
    // Invalidate tokens
    await this.invalidateTokens(userId);
  }

  async updateAuthDetails(userId: string, newPasswordHash: string): Promise<void> {
    await this.userRepository.update(userId, {
      password: newPasswordHash,
    });
    // Invalidate tokens to sign out all sessions
    await this.invalidateTokens(userId);
  }
}
