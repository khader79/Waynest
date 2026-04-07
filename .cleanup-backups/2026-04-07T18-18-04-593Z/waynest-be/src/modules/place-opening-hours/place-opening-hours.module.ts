import { Module } from '@nestjs/common';
import { PlaceOpeningHoursService } from './place-opening-hours.service';
import { PlaceOpeningHoursController } from './place-opening-hours.controller';
import { PlaceOpeningHour } from './entities/place-opening-hour.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([PlaceOpeningHour])],
  controllers: [PlaceOpeningHoursController],
  providers: [PlaceOpeningHoursService],
})
export class PlaceOpeningHoursModule {}
