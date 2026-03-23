import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { PlaceComment } from './entities/place-comment.entity';
import { EventComment } from './entities/event-comment.entity';
import { Place } from '../place/entities/place.entity';
import { Event } from '../event/entities/event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, PlaceComment, EventComment, Place, Event]),
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
