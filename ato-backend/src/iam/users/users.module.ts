// backend/src/users/users.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserIntegrationCredential } from './entities/user-integration-credential.entity';
import { UsersController } from './users.controller';
import { UserCredentialsController } from './user-credentials.controller';
import { UsersService } from './users.service';
import { UserCredentialsService } from './user-credentials.service';
import { RolesModule } from '../roles/roles.module';
import { AuditsModule } from '../../system/audits/audits.module';
import { CountersModule } from '../../system/counters/counters.module';
import { IsExistingUserConstraint } from './validators/is-existing-user.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserIntegrationCredential]),
    forwardRef(() => RolesModule),
    forwardRef(() => AuditsModule),
    CountersModule,
  ],
  controllers: [UsersController, UserCredentialsController],
  providers: [
    UsersService,
    UserCredentialsService,
    IsExistingUserConstraint,
  ],
  exports: [UsersService, UserCredentialsService]
})
export class UsersModule { }