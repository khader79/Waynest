import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

type AuthRequest = {
  user: { sub: string; role: UserRole };
};

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  @Post()
  create(@Body() createEventDto: CreateEventDto, @Request() req: AuthRequest) {
    return this.eventService.create(
      createEventDto,
      req.user.sub,
      req.user.role,
    );
  }

  @Get()
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('cursor') cursor?: string,
  ) {
    return this.eventService.findAll(Number(page), Number(limit), cursor);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req: AuthRequest,
  ) {
    return this.eventService.update(id, updateEventDto, req.user.sub, req.user.role);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.eventService.remove(id, req.user.sub, req.user.role);
  }
}
