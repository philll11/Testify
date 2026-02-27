import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationService } from './integration.service';
import { PlatformEnvironment } from './platform-environment/entities/platform-environment.entity';
import { PlatformProfile } from './platform-profile/entities/platform-profile.entity';
import { PlatformEnvironmentService } from './platform-environment/platform-environment.service';
import { PlatformProfileService } from './platform-profile/platform-profile.service';
import { PlatformEnvironmentController } from './platform-environment/platform-environment.controller';
import { PlatformProfileController } from './platform-profile/platform-profile.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformEnvironment, PlatformProfile]),
    CommonModule,
  ],
  providers: [
    IntegrationService,
    PlatformEnvironmentService,
    PlatformProfileService,
  ],
  controllers: [PlatformEnvironmentController, PlatformProfileController],
  exports: [IntegrationService, PlatformEnvironmentService],
})
export class IntegrationModule { }
