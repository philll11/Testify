// backend/src/database/database.module.ts
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Role } from '../iam/roles/entities/role.entity';
import { User } from '../iam/users/entities/user.entity';
import { Counter } from '../system/counters/entities/counter.entity';
import { SystemConfig } from '../system/config/entities/system-config.entity';
import { AuditEntry } from '../system/audits/entities/audit.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Role, User, Counter, SystemConfig, AuditEntry]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule { }
