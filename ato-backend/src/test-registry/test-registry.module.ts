import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestRegistryController } from './test-registry.controller';
import { TestRegistryService } from './test-registry.service';
import { TestRegistry } from './entities/test-registry.entity';
import { AuditsModule } from '../system/audits/audits.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TestRegistry]),
    AuditsModule
  ],
  controllers: [TestRegistryController],
  providers: [TestRegistryService],
  exports: [TestRegistryService]
})
export class TestRegistryModule { }
