import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestResult, TestResultStatus } from '../../test-results/entities/test-result.entity';
import { Collection } from '../../collections/entities/collection.entity';
import { CollectionStatus } from '../../collections/enums/collection.enums';
import { IntegrationService } from '../../integration/integration.service';

export interface TestExecutionJobData {
    executionResultId: string;
    testId: string;
    environmentId: string;
    collectionId: string;
}

@Processor('test-execution-queue')
export class ExecutionEngineProcessor extends WorkerHost {
    private readonly logger = new Logger(ExecutionEngineProcessor.name);

    constructor(
        @InjectRepository(TestResult)
        private readonly testResultRepo: Repository<TestResult>,
        @InjectRepository(Collection)
        private readonly collectionRepo: Repository<Collection>,
        private readonly integrationService: IntegrationService,
        @InjectQueue('test-execution-queue') private testExecutionQueue: Queue,
    ) {
        super();
    }

    async process(job: Job<TestExecutionJobData, any, string>): Promise<any> {
        const { executionResultId, testId, environmentId, collectionId } = job.data;
        const resultRecord = await this.testResultRepo.findOne({
            where: { id: executionResultId },
        });

        if (!resultRecord) {
            this.logger.error(`Execution record ${executionResultId} not found`);
            return;
        }

        try {
            // Create adapter map (mock user ID since integration currently ignores it or expects standard uuid)
            const platformService = await this.integrationService.getServiceById('system', environmentId);

            if (resultRecord.status === TestResultStatus.PENDING) {
                this.logger.debug(`Initiating test execution for ${testId}`);
                const externalExecutionId = await platformService.initiateTestExecution(testId);

                resultRecord.status = TestResultStatus.RUNNING;
                resultRecord.startedAt = new Date();
                resultRecord.externalExecutionId = externalExecutionId;
                await this.testResultRepo.save(resultRecord);

                // Enqueue polling job (delayed)
                await this.testExecutionQueue.add('poll-test', job.data, { delay: 10000 }); // Poll in 10 seconds
                return;
            }

            if (resultRecord.status === TestResultStatus.RUNNING) {
                this.logger.debug(`Polling test execution for ${testId}`);
                const statusResult = await platformService.checkTestExecutionStatus(resultRecord.externalExecutionId);

                if (!statusResult) {
                    // Still running, requeue for another poll
                    await this.testExecutionQueue.add('poll-test', job.data, { delay: 15000 });
                    return;
                }

                // Has completed!
                if (statusResult.status === 'SUCCESS') {
                    resultRecord.status = TestResultStatus.PASSED;
                } else {
                    resultRecord.status = TestResultStatus.FAILED;
                    resultRecord.errorMessage = statusResult.message;
                }

                resultRecord.rawResult = statusResult;
                resultRecord.completedAt = new Date();
                await this.testResultRepo.save(resultRecord);
                this.logger.log(`Test ${executionResultId} completed with status ${resultRecord.status}`);

                await this.updateCollectionStatus(collectionId);
            }
        } catch (error) {
            this.logger.error(`Failed to process execution ${executionResultId}: ${error.message}`);
            resultRecord.status = TestResultStatus.ERROR;
            resultRecord.errorMessage = error instanceof Error ? error.message : 'Unknown error';
            resultRecord.completedAt = new Date();
            await this.testResultRepo.save(resultRecord);
            await this.updateCollectionStatus(collectionId);
        }
    }

    private async updateCollectionStatus(collectionId: string): Promise<void> {
        const results = await this.testResultRepo.find({
            where: { collectionId: collectionId },
        });

        // Check if all test results are in a terminal state
        const allFinished = results.every(
            (r) =>
                r.status === TestResultStatus.PASSED ||
                r.status === TestResultStatus.FAILED ||
                r.status === TestResultStatus.ERROR,
        );

        if (allFinished) {
            const hasFailures = results.some(
                (r) => r.status === TestResultStatus.FAILED || r.status === TestResultStatus.ERROR,
            );

            const collection = await this.collectionRepo.findOne({
                where: { id: collectionId },
            });

            if (collection) {
                collection.status = hasFailures ? CollectionStatus.FAILED : CollectionStatus.COMPLETED;
                await this.collectionRepo.save(collection);
                this.logger.log(`Collection ${collectionId} finalized with status ${collection.status}`);
            }
        }
    }
}
