// backend/src/users/users.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RolesModule } from '../roles/roles.module';
import { AuditsModule } from '../../system/audits/audits.module';
import { CountersModule } from '../../system/counters/counters.module';
import { IsExistingUserConstraint } from './validators/is-existing-user.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => RolesModule),
    forwardRef(() => AuditsModule),
    CountersModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, IsExistingUserConstraint],
  exports: [UsersService],
})
export class UsersModule {}
