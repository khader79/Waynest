import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripPlannerController } from './trip-planner.controller';
import { TripPlannerService } from './trip-planner.service';
import { SharingService } from './sharing.service';
import { GeminiService } from './gemini.service';
import { ImageFetcherService } from './image-fetcher.service';
import { AiService } from './ai.service';
import { TripPlan } from './entities/trip-planner.entity';
import { TripPlanView } from './entities/trip-plan-view.entity';
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
import { BackfillTripCalendarEntries } from './backfill-trip-calendar-entries';

@Module({
  imports: [
    SocialGraphModule,
    CalendarModule,
    CreditsModule,
    UsageModule,
    TypeOrmModule.forFeature([
      TripPlan,
      TripPlanView,
      SocialPost,
      User,
      City,
      Place,
      Event,
      PlacePricing,
      PlaceOpeningHour,
    ]),
  ],
  controllers: [TripPlannerController],
  providers: [
    TripPlannerService,
    SharingService,
    GeminiService,
    ImageFetcherService,
    AiService,
    BackfillTripCalendarEntries,
  ],
  exports: [TripPlannerService, SharingService, ImageFetcherService, AiService],
})
export class TripPlannerModule {}
