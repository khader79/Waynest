import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TripPlannerService } from './trip-planner.service';
import { CreateTripPlannerDto } from './dto/create-trip-planner.dto';
import { UpdateTripPlannerDto } from './dto/update-trip-planner.dto';

@Controller('trip-planner')
export class TripPlannerController {
  constructor(private readonly tripPlannerService: TripPlannerService) {}

  @Post()
  create(@Body() createTripPlannerDto: CreateTripPlannerDto) {
    return this.tripPlannerService.create(createTripPlannerDto);
  }

  @Get()
  findAll() {
    return this.tripPlannerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tripPlannerService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTripPlannerDto: UpdateTripPlannerDto) {
    return this.tripPlannerService.update(+id, updateTripPlannerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tripPlannerService.remove(+id);
  }
}
