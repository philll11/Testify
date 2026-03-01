import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { Collection } from './entities/collection.entity';
import { CollectionItem } from './entities/collection-item.entity';
import { DiscoveredComponent } from '../discovery/entities/discovered-component.entity';
import { TestRegistry } from '../test-registry/entities/test-registry.entity';
import { AuditsModule } from '../system/audits/audits.module';
import { BackgroundTasksModule } from '../background-tasks/background-tasks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Collection, CollectionItem, DiscoveredComponent, TestRegistry]),
    AuditsModule,
    forwardRef(() => BackgroundTasksModule)
  ],
  controllers: [CollectionsController],
  providers: [CollectionsService],
  exports: [CollectionsService]
})
export class CollectionsModule { }
