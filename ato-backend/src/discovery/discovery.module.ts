import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscoveryService } from './discovery.service';
import { DiscoveryScheduler } from './discovery.scheduler';
import { DiscoveryController } from './discovery.controller';
import { DiscoveredComponent } from './entities/discovered-component.entity';
import { IntegrationModule } from '../integration/integration.module';
import { SystemConfigModule } from '../system/config/system-config.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([DiscoveredComponent]),
        IntegrationModule,
        SystemConfigModule,
    ],
    providers: [DiscoveryService, DiscoveryScheduler],
    controllers: [DiscoveryController],
    exports: [DiscoveryService],
})
export class DiscoveryModule { }
