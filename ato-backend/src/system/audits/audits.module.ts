import { Module, forwardRef } from '@nestjs/common';
import { AuditsService } from './audits.service';
import { AuditsController } from './audits.controller';
import { AuditDiffService } from './audit-diff.service';
import { SystemConfigModule } from '../config/system-config.module';
import { UsersModule } from '../../iam/users/users.module';
import { RolesModule } from '../../iam/roles/roles.module';

@Module({
  imports: [
    SystemConfigModule,
    forwardRef(() => UsersModule),
    forwardRef(() => RolesModule),
  ],
  controllers: [AuditsController],
  providers: [AuditsService, AuditDiffService],
  exports: [AuditsService],
})
export class AuditsModule { }
