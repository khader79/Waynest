import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { Place } from '../place/entities/place.entity';
import { PlacePricing } from '../placepricing/entities/placepricing.entity';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { TripPlannerModule } from '../../trip-planner/trip-planner.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Place, PlacePricing]),
    NotificationsModule,
    TripPlannerModule,
  ],
  providers: [BookingsService],
  controllers: [BookingsController],
})
export class BookingsModule {}
