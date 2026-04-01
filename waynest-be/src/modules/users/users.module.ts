import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Wishlist } from '../wishlist/entities/wishlist.entity';
import { Review } from '../review/entities/review.entity';
import { TripPlan } from 'src/trip-planner/entities/trip-planner.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Booking, Wishlist, Review, TripPlan])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
