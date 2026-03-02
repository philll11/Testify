import { forwardRef, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BackgroundTasksService } from './background-tasks.service';
import { BackgroundTasksController } from './background-tasks.controller';
import { BackgroundTasksWorker } from './background-tasks.worker';
import { IntegrationModule } from '../integration/integration.module';
import { DiscoveryModule } from '../discovery/discovery.module';
import { CollectionsModule } from '../collections/collections.module';
import { CollectionItem } from '../collections/entities/collection-item.entity';
import { PlatformEnvironment } from '../integration/platform-environment/entities/platform-environment.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([CollectionItem, PlatformEnvironment]),
        BullModule.registerQueue({
            name: 'background-tasks',
        }),
        IntegrationModule,
        DiscoveryModule,
        forwardRef(() => CollectionsModule),
    ],
    controllers: [BackgroundTasksController],
    providers: [
        BackgroundTasksService,
        BackgroundTasksWorker,
    ],
    exports: [BackgroundTasksService, BullModule],
})
export class BackgroundTasksModule {}