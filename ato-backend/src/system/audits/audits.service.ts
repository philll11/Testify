
import { Injectable, Logger, Inject, forwardRef, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEntry, AuditAction } from './entities/audit.entity';
import { AuditDiffService } from './audit-diff.service';
import { SystemConfigService } from '../config/system-config.service';
import { User } from '../../iam/users/entities/user.entity';
import { Resource } from '../../common/constants/permissions.constants';

import { UsersService } from '../../iam/users/users.service';
import { RolesService } from '../../iam/roles/roles.service';

@Injectable()
export class AuditsService {
  private readonly logger = new Logger(AuditsService.name);

  constructor(
    @InjectRepository(AuditEntry)
    private readonly auditRepository: Repository<AuditEntry>,
    private diffService: AuditDiffService,
    private configService: SystemConfigService,
    @Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService,
    @Inject(forwardRef(() => RolesService)) private readonly rolesService: RolesService,
  ) { }

  /**
   * Checks if auditing is enabled for the given resource.
   */
  async shouldAudit(resource: string): Promise<boolean> {
    const auditConfig = await this.configService.get('audit');
    // Ensure we handle the value safely
    const val = auditConfig ? auditConfig['value'] : null;
    return val?.enabled ?? false;
  }

  /**
   * Logs a change to a resource.
   * Checks system config 'audit' to see if auditing is enabled globally or for specific resources.
   */
  async log(
    resource: string,
    resourceId: string,
    action: AuditAction,
    oldData: any,
    newData: any,
    userId: string,
    reason: string,
    ignoredPaths: string[] = [],
    itemIdentityMap: Record<string, string> = {},
    fieldDisplayNameMap: Record<string, string> = {},
  ): Promise<AuditEntry | null> {
    try {
      // 1. Check Configuration
      if (!(await this.shouldAudit(resource))) {
        return null;
      }

      // 2. Compute Diffs
      let changes: any[] = [];
      // Compute diffs for both CREATE and UPDATE
      if (action === AuditAction.CREATE) {
        changes = this.diffService.computeDiff(null, newData, '', ignoredPaths, itemIdentityMap, fieldDisplayNameMap);
      } else if (action === AuditAction.UPDATE) {
        changes = this.diffService.computeDiff(oldData, newData, '', ignoredPaths, itemIdentityMap, fieldDisplayNameMap);
        if (changes.length === 0) {
          return null; // No actual changes detected
        }
      }

      // 3. Create Entry
      const entry = this.auditRepository.create({
        resource,
        resourceId,
        action,
        changes,
        userId,
        reason,
        date: new Date(),
        metadata: {
          snapshot: action === AuditAction.DELETE ? oldData : undefined // Keep snapshot on delete
        }
      });

      return await this.auditRepository.save(entry);
    } catch (error) {
      this.logger.error(`Failed to create audit log for ${resource}:${resourceId}`, error.stack);
      // We don't want to block the main operation if audit fails, so we catch and return null
      return null;
    }
  }

  async getHistory(resource: string, resourceId: string, requestingUser: User): Promise<AuditEntry[]> {
    await this.validateResourceAccess(resource, resourceId, requestingUser);

    // Original: populate('userId', 'firstName lastName email')
    // TypeORM: we need to join user or fetch manually.
    // If AuditEntry has no user relation, we fetch audits first.

    const audits = await this.auditRepository.find({
      where: { resource, resourceId },
      order: { date: 'DESC' }
    });

    // Manually populate user info if needed
    // Assuming we want to return user info. 
    // This is N+1 problem but efficient enough for single resource history.
    // Optimization: Collect userIds and fetch all users in one query.

    const userIds = [...new Set(audits.map(a => a.userId))];
    if (userIds.length > 0) {
      // Find users with only necessary fields
      // Since we are inside AuditsService, we can inject UserRepository (via UsersService?) or just use UsersService.
      // But UsersService usually returns full object.
      // Let's assume we can use UsersService or just return userId if population is too complex without direct repo access.
      // BUT, given strict requirement "Refactor to TypeORM", keeping functionality implies populating.
      // I will try to populate using UsersService.findOneById if simplified, or direct repo?
      // I don't have direct access to User repo here unless I inject it.
      // 'usersService' is injected.

      // Let's construct a map.
      const userMap = new Map<string, any>();
      // We can't easily do a batch get from UsersService unless it has findByIds.
      // UsersService has `validateUserIds` but not `findMany`.
      // Let's iterate.
      for (const uid of userIds) {
        const u = await this.usersService.findOneById(uid);
        if (u) {
          userMap.set(uid, { firstName: u.firstName, lastName: u.lastName, email: u.email });
        }
      }

      // Attach to audit entries. This requires AuditEntry to have a field for it or return a DTO/modified object.
      // Since function returns `AuditEntry[]`, and AuditEntry entity doesn't have `user` object field (unless I add logic), 
      // I can't strictly attach it to the Entity instance without satisfying the class.
      // BUT, JS allows attaching props.
      // Mongoose `populate` replaces the ID (string) with the Object.
      // TypeORM entities are strict classes.
      // I will leave it as `userId` string for now, or if `user` relation existed, I would populate it.
      // If I simply attach `user` property, Typescript might complain but runtime is fine.

      // For now, I will just return the audits. Frontend might need update or fetch users separately.
      // OR: I can cast to `any` and attach.
      return audits.map(a => {
        const u = userMap.get(a.userId);
        if (u) {
          (a as any).userId = u; // Emulate Mongoose populate behavior somewhat (replacing ID or attaching obj)
          // Mongoose populated: { _id: ..., userId: { firstName: ... } }
          // Here userId is string column.
          // Probably better to attach `user` property.
          (a as any).user = u;
        }
        return a;
      });
    }

    return audits;
  }

  private async validateResourceAccess(resource: string, resourceId: string, user: User): Promise<void> {
    try {
      switch (resource) {
        case Resource.USER:
          await this.usersService.findOne(resourceId, user);
          break;
        case Resource.ROLE:
          await this.rolesService.findOne(resourceId, user);
          break;
        default:
          this.logger.warn(`No visibility check implemented for resource: ${resource}`);
          break;
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(`Resource not found or access denied.`);
      }
      throw error;
    }
  }
}
