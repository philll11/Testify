import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SystemConfigService } from '../system/config/system-config.service';
import { SystemConfigKeys } from '../common/constants/system-config.constants';
import { UpdateDiscoveryConfigDto } from '../system/config/dto/update-discovery-config.dto';

@Injectable()
export class DiscoveryScheduler implements OnApplicationBootstrap {
    private readonly logger = new Logger(DiscoveryScheduler.name);
    private readonly JOB_NAME = 'discovery_sync_job';

    constructor(
        @InjectQueue('background-tasks') private readonly queue: Queue,
        private readonly systemConfigService: SystemConfigService,
    ) { }

    async onApplicationBootstrap() {
        await this.refreshSchedule();
    }

    @OnEvent('discovery.config.updated')
    async handleConfigUpdate() {
        this.logger.log('Discovery configuration updated. Refreshing schedule...');
        await this.refreshSchedule();
    }

    async refreshSchedule() {
        try {
            const configEntity = await this.systemConfigService.get(SystemConfigKeys.DISCOVERY.CONFIG);
            const config = configEntity?.value as UpdateDiscoveryConfigDto | undefined;
            const cronExpression = config?.syncScheduleCron;
            const isSyncActive = config?.isSyncActive !== false; // Active by default or if true

            // Unschedule if exists
            const jobSchedulers = await this.queue.getJobSchedulers();
            const existingScheduler = jobSchedulers.find(scheduler => scheduler.name === this.JOB_NAME);

            if (existingScheduler) {
                await this.queue.removeJobScheduler(existingScheduler.key);
                this.logger.log(`Existing cron job '${this.JOB_NAME}' removed from queue.`);
            }

            if (!isSyncActive) {
                this.logger.log('Synchronization schedule is inactive by configuration. Job not scheduled.');
                return;
            }

            if (cronExpression) {
                await this.queue.add(
                    this.JOB_NAME,
                    {}, // no specific payload
                    {
                        repeat: { pattern: cronExpression },
                        jobId: this.JOB_NAME,
                    }
                );
                this.logger.log(`Cron job '${this.JOB_NAME}' scheduled in BullMQ with expression: ${cronExpression}`);
            } else {
                this.logger.warn('No cron expression found in discovery config. Synchronization is disabled.');
            }
        } catch (error) {
            this.logger.error('Failed to refresh discovery sync schedule', error instanceof Error ? error.stack : error);
        }
    }
}
