import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { Collection } from './entities/collection.entity';
import { CollectionItem } from './entities/collection-item.entity';
import { DiscoveredComponent } from '../discovery/entities/discovered-component.entity';
import { TestRegistry } from '../test-registry/entities/test-registry.entity';
import { PlatformEnvironment } from '../integration/platform-environment/entities/platform-environment.entity';
import { AuditsModule } from '../system/audits/audits.module';
import { BackgroundTasksModule } from '../background-tasks/background-tasks.module';
import { ExecutionEngineModule } from '../execution-engine/execution-engine.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Collection, CollectionItem, DiscoveredComponent, TestRegistry, PlatformEnvironment]),
    AuditsModule,
    forwardRef(() => BackgroundTasksModule),
    ExecutionEngineModule
  ],
  controllers: [CollectionsController],
  providers: [CollectionsService],
  exports: [CollectionsService]
})
export class CollectionsModule { }
