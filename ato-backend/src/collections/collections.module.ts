import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { Collection } from './entities/collection.entity';
import { CollectionItem } from './entities/collection-item.entity';
import { DiscoveredComponent } from '../discovery/entities/discovered-component.entity';
import { TestRegistry } from '../test-registry/entities/test-registry.entity';
import { AuditsModule } from '../system/audits/audits.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Collection, CollectionItem, DiscoveredComponent, TestRegistry]),
    AuditsModule
  ],
  controllers: [CollectionsController],
  providers: [CollectionsService]
})
export class CollectionsModule { }
