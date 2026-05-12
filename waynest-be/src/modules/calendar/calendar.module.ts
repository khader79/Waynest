import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarEntry } from './entities/calendar-entry.entity';
import { Place } from '../place/entities/place.entity';
import { Friendship } from '../social-graph/entities/friendship.entity';
import { User } from '../users/entities/user.entity';
import { Event } from '../event/entities/event.entity';
import { TripPlan } from '../../trip-planner/entities/trip-planner.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CalendarEntry, Place, Friendship, User, Event, TripPlan]),
    NotificationsModule,
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
