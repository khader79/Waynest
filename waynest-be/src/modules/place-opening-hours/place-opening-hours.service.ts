import { Injectable } from '@nestjs/common';
import { CreatePlaceOpeningHourDto } from './dto/create-place-opening-hour.dto';
import { UpdatePlaceOpeningHourDto } from './dto/update-place-opening-hour.dto';

@Injectable()
export class PlaceOpeningHoursService {
  create(createPlaceOpeningHourDto: CreatePlaceOpeningHourDto) {
    return 'This action adds a new placeOpeningHour';
  }

  findAll() {
    return `This action returns all placeOpeningHours`;
  }

  findOne(id: number) {
    return `This action returns a #${id} placeOpeningHour`;
  }

  update(id: number, updatePlaceOpeningHourDto: UpdatePlaceOpeningHourDto) {
    return `This action updates a #${id} placeOpeningHour`;
  }

  remove(id: number) {
    return `This action removes a #${id} placeOpeningHour`;
  }
}
