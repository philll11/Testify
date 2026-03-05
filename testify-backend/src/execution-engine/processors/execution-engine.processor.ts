import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestExecutionResult, TestExecutionStatus } from '../entities/test-execution-result.entity';
import { Collection } from '../../collections/entities/collection.entity';
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
        @InjectRepository(TestExecutionResult)
        private readonly testExecutionResultRepo: Repository<TestExecutionResult>,
        @InjectRepository(Collection)
        private readonly collectionRepo: Repository<Collection>,
        private readonly integrationService: IntegrationService,
        @InjectQueue('test-execution-queue') private testExecutionQueue: Queue,
    ) {
        super();
    }

    async process(job: Job<TestExecutionJobData, any, string>): Promise<any> {
        const { executionResultId, testId, environmentId, collectionId } = job.data;
        const resultRecord = await this.testExecutionResultRepo.findOne({
            where: { id: executionResultId },
        });

        if (!resultRecord) {
            this.logger.error(`Execution record ${executionResultId} not found`);
            return;
        }

        try {
            // Create adapter map (mock user ID since integration currently ignores it or expects standard uuid)
            const platformService = await this.integrationService.getServiceById('system', environmentId);

            if (resultRecord.status === TestExecutionStatus.PENDING) {
                this.logger.debug(`Initiating test execution for ${testId}`);
                const externalExecutionId = await platformService.initiateTestExecution(testId);

                resultRecord.status = TestExecutionStatus.RUNNING;
                resultRecord.startedAt = new Date();
                resultRecord.externalExecutionId = externalExecutionId;
                await this.testExecutionResultRepo.save(resultRecord);

                // Enqueue polling job (delayed)
                await this.testExecutionQueue.add('poll-test', job.data, { delay: 10000 }); // Poll in 10 seconds
                return;
            }

            if (resultRecord.status === TestExecutionStatus.RUNNING) {
                this.logger.debug(`Polling test execution for ${testId}`);
                const statusResult = await platformService.checkTestExecutionStatus(resultRecord.externalExecutionId);

                if (!statusResult) {
                    // Still running, requeue for another poll
                    await this.testExecutionQueue.add('poll-test', job.data, { delay: 15000 });
                    return;
                }

                // Has completed!
                if (statusResult.status === 'SUCCESS') {
                    resultRecord.status = TestExecutionStatus.PASSED;
                } else {
                    resultRecord.status = TestExecutionStatus.FAILED;
                    resultRecord.errorMessage = statusResult.message;
                }

                resultRecord.rawResult = statusResult;
                resultRecord.completedAt = new Date();
                await this.testExecutionResultRepo.save(resultRecord);
                this.logger.log(`Test ${executionResultId} completed with status ${resultRecord.status}`);

                // TODO: Could aggregate final collection status here or trigger webhook
            }
        } catch (error) {
            this.logger.error(`Failed to process execution ${executionResultId}: ${error.message}`);
            resultRecord.status = TestExecutionStatus.ERROR;
            resultRecord.errorMessage = error instanceof Error ? error.message : 'Unknown error';
            resultRecord.completedAt = new Date();
            await this.testExecutionResultRepo.save(resultRecord);
        }
    }
}
