import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CalendarService } from './calendar.service';
import { CreateCalendarEntryDto } from './dto/create-calendar-entry.dto';
import { UpdateCalendarEntryDto } from './dto/update-calendar-entry.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripPlan } from '../../trip-planner/entities/trip-planner.entity';

type AuthRequest = {
  user: {
    sub: string;
  };
};

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    @InjectRepository(TripPlan)
    private readonly tripPlanRepo: Repository<TripPlan>,
  ) {}

  @Get()
  findByUser(@Request() req: AuthRequest) {
    return this.calendarService.findByUser(req.user.sub);
  }

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateCalendarEntryDto) {
    return this.calendarService.create(req.user.sub, dto);
  }

  @Patch(':id')
  update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarEntryDto,
  ) {
    return this.calendarService.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.calendarService.remove(req.user.sub, id);
  }

  @Post('share-trip/:tripPlanId')
  @HttpCode(200)
  async shareTripToUser(
    @Request() req: AuthRequest,
    @Param('tripPlanId') tripPlanId: string,
    @Body() body: { targetUserId: string },
  ) {
    if (!body.targetUserId) {
      throw new BadRequestException('targetUserId is required');
    }
    const userId = req.user.sub;
    const tripPlan = await this.tripPlanRepo.findOne({
      where: { id: tripPlanId },
      relations: ['city'],
    });
    if (!tripPlan) {
      throw new NotFoundException('Trip plan not found');
    }
    if (tripPlan.userId !== userId) {
      throw new ForbiddenException('You do not own this trip plan');
    }
    const count = await this.calendarService.shareTripToUser(
      userId,
      tripPlanId,
      body.targetUserId,
      tripPlan.generatedPlan,
      tripPlan.title ?? null,
      tripPlan.city?.name ?? 'Unknown',
    );
    return { message: `Shared ${count} entries to calendar`, count };
  }
}
