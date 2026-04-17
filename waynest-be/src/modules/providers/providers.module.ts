import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from './entities/provider.entity';
import { Place } from '../place/entities/place.entity';
import { PlaceVerificationRequest } from './entities/place-verification-request.entity';
import { Event } from '../event/entities/event.entity';
import { Tag } from '../tag/entities/tag.entity';
import { Review } from '../review/entities/review.entity';
import { PlaceOpeningHour } from '../place-opening-hours/entities/place-opening-hour.entity';
import { PlacePricing } from '../placepricing/entities/placepricing.entity';
import { CitiesModule } from '../cities/cities.module';
import { ProviderMembershipModule } from '../provider-membership/provider-membership.module';
import { EventModule } from '../event/event.module';
import { UploadModule } from '../upload/upload.module';
import { SocialGraphModule } from '../social-graph/social-graph.module';
import { TripPlannerModule } from '../../trip-planner/trip-planner.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Provider,
      Place,
      PlaceVerificationRequest,
      Event,
      Tag,
      Review,
      PlaceOpeningHour,
      PlacePricing,
    ]),
    CitiesModule,
    ProviderMembershipModule,
    EventModule,
    UploadModule,
    SocialGraphModule,
    TripPlannerModule,
  ],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
