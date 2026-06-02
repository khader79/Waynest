import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TripPlannerService } from '../trip-planner/trip-planner.service';
import { NotificationsGateway } from '../modules/notifications/notifications.gateway';
import type { ItineraryJobData } from './itinerary-queue.service';

@Processor('itinerary')
export class ItineraryProcessor extends WorkerHost {
  private readonly logger = new Logger(ItineraryProcessor.name);

  constructor(
    private readonly tripPlannerService: TripPlannerService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {
    super();
  }

  async process(job: Job<ItineraryJobData>): Promise<unknown> {
    const { userId, dto, rateLimitKey } = job.data;

    this.logger.log(
      `Processing itinerary job ${job.id} for user=${userId ?? 'guest'}`,
    );

    try {
      const result = await this.tripPlannerService.generate(
        userId,
        dto,
        rateLimitKey,
      );

      if (userId) {
        this.notificationsGateway.emitToUser(
          userId,
          'itinerary_ready',
          {
            jobId: job.id,
            ...result,
          },
        );
        this.logger.log(
          `Emitted itinerary_ready for user=${userId} job=${job.id}`,
        );
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Itinerary job ${job.id} failed for user=${userId ?? 'guest'}: ${message}`,
      );

      if (userId) {
        this.notificationsGateway.emitToUser(
          userId,
          'itinerary_error',
          { jobId: job.id, error: message },
        );
      }

      throw error;
    }
  }
}
