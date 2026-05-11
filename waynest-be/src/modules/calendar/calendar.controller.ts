import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CalendarService } from './calendar.service';
import { CreateCalendarEntryDto } from './dto/create-calendar-entry.dto';
import { UpdateCalendarEntryDto } from './dto/update-calendar-entry.dto';

type AuthRequest = {
  user: {
    sub: string;
  };
};

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

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
}