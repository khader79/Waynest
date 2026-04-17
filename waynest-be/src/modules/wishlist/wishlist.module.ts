import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { Place } from '../place/entities/place.entity';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';
import { TripPlannerModule } from '../../trip-planner/trip-planner.module';

@Module({
  imports: [TypeOrmModule.forFeature([Wishlist, Place]), TripPlannerModule],
  controllers: [WishlistController],
  providers: [WishlistService],
})
export class WishlistModule {}
