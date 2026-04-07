import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripPlannerController } from './trip-planner.controller';
import { TripPlannerService } from './trip-planner.service';
import { SharingService } from './sharing.service';
import { GeminiService } from './gemini.service';
import { ImageFetcherService } from './image-fetcher.service';
import { TripPlan } from './entities/trip-planner.entity';
import { PlaceOpeningHour } from 'src/modules/place-opening-hours/entities/place-opening-hour.entity';
import { Place } from 'src/modules/place/entities/place.entity';
import { PlacePricing } from 'src/modules/placepricing/entities/placepricing.entity';
import { Event } from 'src/modules/event/entities/event.entity';
import { City } from 'src/modules/cities/entities/city.entity';
import { User } from 'src/modules/users/entities/user.entity';

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
  ],
  exports: [TripPlannerService, SharingService],
})
export class TripPlannerModule {}
