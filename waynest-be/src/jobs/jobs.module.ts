import {
  DynamicModule,
  Module,
  Logger,
  forwardRef,
  Provider,
} from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { MonthlyResetJob } from './monthly-reset.job';
import { ItineraryQueueService } from './itinerary-queue.service';
import { ItineraryProcessor } from './itinerary.processor';
import { TripPlannerModule } from '../trip-planner/trip-planner.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';

function redisConfigured(): boolean {
  return !!(process.env.REDIS_URL || process.env.REDID_HOST?.trim());
}

@Module({})
export class JobsModule {
  static forRoot(): DynamicModule {
    const redisEnabled = redisConfigured();
    const logger = new Logger('JobsModule');

    if (!redisEnabled) {
      logger.warn(
        'REDIS_URL / REDIS_HOST not set — BullMQ job queue disabled. ' +
          'Itinerary generation will run synchronously.',
      );
    }

    const imports: DynamicModule['imports'] = [
      ScheduleModule.forRoot(),
      ...(redisEnabled
        ? [BullModule.registerQueue({ name: 'itinerary' })]
        : []),
      forwardRef(() => TripPlannerModule),
      forwardRef(() => NotificationsModule),
    ];

    const extraProviders: Provider[] = [
      MonthlyResetJob,
      ...(redisEnabled ? [ItineraryQueueService, ItineraryProcessor] : []),
    ];

    const exports: DynamicModule['exports'] = [
      ...(redisEnabled ? [ItineraryQueueService] : []),
    ];

    return {
      module: JobsModule,
      imports,
      providers: extraProviders,
      exports,
    };
  }
}

