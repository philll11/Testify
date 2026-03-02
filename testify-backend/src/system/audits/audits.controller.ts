import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { AuditsService } from './audits.service';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../iam/users/entities/user.entity';

@Controller('system/audit')
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get(':resource/:id')
  @RequirePermission(PERMISSIONS.AUDIT_VIEW)
  async getHistory(
    @Param('resource') resource: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requestingUser: User,
  ) {
    return this.auditsService.getHistory(resource, id, requestingUser);
  }
}
