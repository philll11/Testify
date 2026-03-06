import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestRegistryController } from './test-registry.controller';
import { TestRegistryService } from './test-registry.service';
import { TestRegistry } from './entities/test-registry.entity';
import { AuditsModule } from '../system/audits/audits.module';
import { BullModule } from '@nestjs/bullmq';
import { TestRegistryWorker } from './test-registry.worker';
import { DiscoveryModule } from '../discovery/discovery.module';
import { BackgroundTasksModule } from '../background-tasks/background-tasks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TestRegistry]),
    AuditsModule,
    DiscoveryModule,
    BackgroundTasksModule,
    BullModule.registerQueue({
      name: 'test-registry-tasks',
    }),
  ],
  controllers: [TestRegistryController],
  providers: [TestRegistryService, TestRegistryWorker],
  exports: [TestRegistryService]
})
export class TestRegistryModule { }
