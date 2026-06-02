import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { CreateTripPlannerDto } from '../trip-planner/dto/create-trip-planner.dto';

export interface ItineraryJobData {
  userId: string | null;
  dto: CreateTripPlannerDto;
  rateLimitKey: string;
}

@Injectable()
export class ItineraryQueueService {
  private readonly logger = new Logger(ItineraryQueueService.name);

  constructor(
    @InjectQueue('itinerary') private readonly itineraryQueue: Queue,
  ) {}

  async addGenerateJob(data: ItineraryJobData): Promise<string> {
    const job = await this.itineraryQueue.add('generate', data, {
      removeOnComplete: { age: 3600, count: 100 },
      removeOnFail: { age: 3600, count: 100 },
    });
    this.logger.log(`Queued itinerary job ${job.id} for user=${data.userId ?? 'guest'}`);
    return job.id ?? 'unknown';
  }

  async getJobResult(
    jobId: string,
  ): Promise<{
    status: 'completed' | 'failed' | 'processing' | 'not_found';
    result?: unknown;
    error?: string;
  }> {
    const job = await this.itineraryQueue.getJob(jobId);
    if (!job) return { status: 'not_found' };

    const state = await job.getState();
    if (state === 'completed') {
      return { status: 'completed', result: job.returnvalue };
    }
    if (state === 'failed') {
      return { status: 'failed', error: job.failedReason ?? 'Unknown error' };
    }
    return { status: 'processing' };
  }
}
