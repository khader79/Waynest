import { Module } from '@nestjs/common';
import { PlaceService } from './place.service';
import { PlaceController } from './place.controller';
import { Place } from './entities/place.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from '../providers/entities/provider.entity';
import { City } from '../cities/entities/city.entity';
import { Tag } from '../tag/entities/tag.entity';
import { Review } from '../review/entities/review.entity';
import { Event } from '../event/entities/event.entity';
import { PlacePricing } from '../placepricing/entities/placepricing.entity';
import { PlaceOpeningHour } from '../place-opening-hours/entities/place-opening-hour.entity';
import { ProvidersModule } from '../providers/providers.module';
import { CitiesModule } from '../cities/cities.module';
import { TagModule } from '../tag/tag.module';
import { ReviewModule } from '../review/review.module';
import { EventModule } from '../event/event.module';
import { PlacepricingModule } from '../placepricing/placepricing.module';
import { PlaceOpeningHoursModule } from '../place-opening-hours/place-opening-hours.module';
import { TripPlannerModule } from '../../trip-planner/trip-planner.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Place,
      Provider,
      City,
      Tag,
      Review,
      Event,
      PlacePricing,
      PlaceOpeningHour,
    ]),
    ProvidersModule,
    CitiesModule,
    TagModule,
    ReviewModule,
    EventModule,
    PlacepricingModule,
    PlaceOpeningHoursModule,
    TripPlannerModule,
  ],
  controllers: [PlaceController],
  providers: [PlaceService],
  exports: [PlaceService],
})
export class PlaceModule {}
