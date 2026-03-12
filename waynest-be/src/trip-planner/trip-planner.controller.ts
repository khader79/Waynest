import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { TripPlannerService } from './trip-planner.service';
import { CreateTripPlannerDto } from './dto/create-trip-planner.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('trip-planner')
//@UseGuards(JwtAuthGuard)
export class TripPlannerController {
  constructor(private readonly tripPlannerService: TripPlannerService) {}

  @Post()
  generate(@Body() dto: CreateTripPlannerDto, @Request() req) {
    return this.tripPlannerService.generate(
      'fad9d4f1-9cd7-4ecd-a420-9fd805490370',
      dto,
    );
  }
}
