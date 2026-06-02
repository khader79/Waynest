import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripPlannerController } from './trip-planner.controller';
import { TripPlannerService } from './trip-planner.service';
import { SharingService } from './sharing.service';
import { GeminiService } from './gemini.service';
import { ImageFetcherService } from './image-fetcher.service';
import { AiService } from './ai.service';
import { GeoRoutingService } from './geo-routing.service';
import { TripCacheService } from './trip-cache.service';
import { TripPlan } from './entities/trip-planner.entity';
import { TripPlanView } from './entities/trip-plan-view.entity';
import { Expense } from './entities/expense.entity';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';
import { City } from '../modules/cities/entities/city.entity';
import { User } from '../modules/users/entities/user.entity';
import { Place } from '../modules/place/entities/place.entity';
import { Event } from '../modules/event/entities/event.entity';
import { PlacePricing } from '../modules/placepricing/entities/placepricing.entity';
import { PlaceOpeningHour } from '../modules/place-opening-hours/entities/place-opening-hour.entity';
import { SocialPost } from '../modules/social-content/entities/social-post.entity';
import { SocialGraphModule } from '../modules/social-graph/social-graph.module';
import { CalendarModule } from '../modules/calendar/calendar.module';
import { CreditsModule } from '../modules/credits/credits.module';
import { UsageModule } from '../modules/usage/usage.module';
import { JobsModule } from '../jobs/jobs.module';
import { BackfillTripCalendarEntries } from './backfill-trip-calendar-entries';
import { MediaEnrichmentService } from './media-enrichment.service';

@Module({
  imports: [
    forwardRef(() => SocialGraphModule),
    forwardRef(() => CalendarModule),
    CreditsModule,
    UsageModule,
    forwardRef(() => JobsModule),
    TypeOrmModule.forFeature([
      TripPlan,
      TripPlanView,
      Expense,
      SocialPost,
      User,
      City,
      Place,
      Event,
      PlacePricing,
      PlaceOpeningHour,
    ]),
  ],
  controllers: [TripPlannerController, ExpenseController],
  providers: [
    TripPlannerService,
    SharingService,
    GeminiService,
    ImageFetcherService,
    AiService,
    GeoRoutingService,
    TripCacheService,
    BackfillTripCalendarEntries,
    MediaEnrichmentService,
    ExpenseService,
  ],
  exports: [TripPlannerService, SharingService, ImageFetcherService, AiService, GeoRoutingService, TripCacheService, MediaEnrichmentService, ExpenseService],
})
export class TripPlannerModule {}
