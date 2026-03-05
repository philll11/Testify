import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestResultsService } from './test-results.service';
import { TestResultsController } from './test-results.controller';
import { TestResult } from './entities/test-result.entity';
import { DiscoveryModule } from '../discovery/discovery.module';
import { DiscoveredComponent } from '../discovery/entities/discovered-component.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([TestResult, DiscoveredComponent]),
        DiscoveryModule,
    ],
    controllers: [TestResultsController],
    providers: [TestResultsService],
    exports: [TestResultsService],
})
export class TestResultsModule { }
