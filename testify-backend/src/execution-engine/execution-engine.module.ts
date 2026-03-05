import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ExecutionEngineService } from './execution-engine.service';
import { TestExecutionResult } from './entities/test-execution-result.entity';
import { Collection } from '../collections/entities/collection.entity';
import { ExecutionEngineProcessor } from './processors/execution-engine.processor';
import { IntegrationModule } from '../integration/integration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TestExecutionResult, Collection]),
    BullModule.registerQueue({
      name: 'test-execution-queue',
    }),
    IntegrationModule,
  ],
  providers: [ExecutionEngineService, ExecutionEngineProcessor],
  exports: [ExecutionEngineService],
})
export class ExecutionEngineModule { }
