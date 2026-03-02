import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../iam/auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Background Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('background-tasks')
export class BackgroundTasksController {
    constructor(
        @InjectQueue('background-tasks') private readonly backgroundTasksQueue: Queue,
    ) {}

    @Get('job/:id')
    @ApiOperation({ summary: 'Get background job status' })
    async getJobStatus(@Param('id') id: string) {
        const job = await this.backgroundTasksQueue.getJob(id);
        if (!job) {
            return {
                status: 'not_found',
            };
        }
        
        const state = await job.getState();
        return {
            id: job.id,
            name: job.name,
            status: state,
            progress: job.progress,
            failedReason: job.failedReason,
            finishedOn: job.finishedOn,
            processedOn: job.processedOn,
        };
    }
}