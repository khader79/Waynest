import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PlaceOpeningHoursService } from './place-opening-hours.service';
import { CreatePlaceOpeningHourDto } from './dto/create-place-opening-hour.dto';
import { UpdatePlaceOpeningHourDto } from './dto/update-place-opening-hour.dto';

@Controller('place-opening-hours')
export class PlaceOpeningHoursController {
  constructor(private readonly placeOpeningHoursService: PlaceOpeningHoursService) {}

  @Post()
  create(@Body() createPlaceOpeningHourDto: CreatePlaceOpeningHourDto) {
    return this.placeOpeningHoursService.create(createPlaceOpeningHourDto);
  }

  @Get()
  findAll() {
    return this.placeOpeningHoursService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.placeOpeningHoursService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlaceOpeningHourDto: UpdatePlaceOpeningHourDto) {
    return this.placeOpeningHoursService.update(+id, updatePlaceOpeningHourDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.placeOpeningHoursService.remove(+id);
  }
}
