import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripPlannerController } from './trip-planner.controller';
import { TripPlannerService } from './trip-planner.service';
import { SharingService } from './sharing.service';
import { GeminiService } from './gemini.service';
import { ImageFetcherService } from './image-fetcher.service';
import { AiService } from './ai.service';
import { TripPlan } from './entities/trip-planner.entity';
import { City } from '../modules/cities/entities/city.entity';
import { User } from '../modules/users/entities/user.entity';
import { Place } from '../modules/place/entities/place.entity';
import { Event } from '../modules/event/entities/event.entity';
import { PlacePricing } from '../modules/placepricing/entities/placepricing.entity';
import { PlaceOpeningHour } from '../modules/place-opening-hours/entities/place-opening-hour.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TripPlan,
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
  ],
  exports: [TripPlannerService, SharingService, ImageFetcherService, AiService],
})
export class TripPlannerModule {}
