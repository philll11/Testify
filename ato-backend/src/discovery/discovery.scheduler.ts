import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { CronJob } from 'cron';
import { DiscoveryService } from './discovery.service';
import { SystemConfigService } from '../system/config/system-config.service';
import { SystemConfigKeys } from '../common/constants/system-config.constants';
import { UpdateDiscoveryConfigDto } from '../system/config/dto/update-discovery-config.dto';

@Injectable()
export class DiscoveryScheduler implements OnApplicationBootstrap {
    private readonly logger = new Logger(DiscoveryScheduler.name);
    private readonly JOB_NAME = 'discovery_sync_job';

    constructor(
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly discoveryService: DiscoveryService,
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
            if (this.schedulerRegistry.doesExist('cron', this.JOB_NAME)) {
                this.schedulerRegistry.deleteCronJob(this.JOB_NAME);
                this.logger.log(`Existing cron job '${this.JOB_NAME}' removed.`);
            }

            if (!isSyncActive) {
                this.logger.log('Synchronization schedule is inactive by configuration. Job not scheduled.');
                return;
            }

            if (cronExpression) {
                const job = new CronJob(cronExpression, () => {
                    this.logger.log(`Executing Cron Job: ${this.JOB_NAME}`);
                    this.discoveryService.syncDatabase().catch(e => {
                        this.logger.error('Scheduled sync failed', e);
                    });
                });

                this.schedulerRegistry.addCronJob(this.JOB_NAME, job);
                job.start();
                this.logger.log(`Cron job '${this.JOB_NAME}' scheduled with expression: ${cronExpression}`);
            } else {
                this.logger.warn('No cron expression found in discovery config. Synchronization is disabled.');
            }
        } catch (error) {
            this.logger.error('Failed to refresh discovery sync schedule', error instanceof Error ? error.stack : error);
        }
    }
}
