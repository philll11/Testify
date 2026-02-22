import { Module } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { UsersModule } from '../iam/users/users.module'; // Access to UserCredentialsService
import { SystemConfigModule } from '../system/config/system-config.module'; // Access to SystemConfigService

@Module({
    imports: [
        UsersModule,
        SystemConfigModule
    ],
    providers: [IntegrationService],
    exports: [IntegrationService]
})
export class IntegrationModule { }
