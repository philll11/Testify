import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from '../collections/entities/collection.entity';
import { TestResult, TestResultStatus } from '../test-results/entities/test-result.entity';
import { TestExecutionJobData } from './processors/execution-engine.processor';

@Injectable()
export class ExecutionEngineService {
    private readonly logger = new Logger(ExecutionEngineService.name);

    constructor(
        @InjectQueue('test-execution-queue') private testExecutionQueue: Queue,
        @InjectRepository(TestResult)
        private readonly testResultRepo: Repository<TestResult>,
        @InjectRepository(Collection)
        private readonly collectionRepo: Repository<Collection>,
    ) { }

    async queueCollectionExecution(collectionId: string, environmentId: string, testIds: string[]): Promise<void> {
        this.logger.log(`Queueing execution for collection ${collectionId} in environment ${environmentId}`);

        const collection = await this.collectionRepo.findOne({
            where: { id: collectionId },
        });

        if (!collection) {
            throw new Error(`Collection ${collectionId} not found`);
        }

        // Set the expected total tests based on actual resolved test ids
        collection.totalExpectedTests = testIds.length;
        await this.collectionRepo.save(collection);

        // Queue up each individual test from the resolved list
        for (const testId of testIds) {
            // 1. Create a pending execution result in the database
            const initialRecord = this.testResultRepo.create({
                collectionId: collection.id,
                testId: testId,
                status: TestResultStatus.PENDING,
            });
            const savedRecord = await this.testResultRepo.save(initialRecord);

            // 2. Dispatch a job to the BullMQ queue
            const jobData: TestExecutionJobData = {
                executionResultId: savedRecord.id,
                testId: testId,
                environmentId: environmentId,
                collectionId: collection.id
            };

            await this.testExecutionQueue.add('execute-test', jobData, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
                removeOnComplete: true,
                removeOnFail: false
            });

            this.logger.debug(`Enqueued test component ${testId} with execution payload ID ${savedRecord.id}`);
        }
    }
}

