import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Roles } from 'src/modules/auth/roles.decorator';
import { RoleGuard } from 'src/modules/auth/guards/role.guard';
import { UserRole } from 'src/modules/users/entities/user.entity';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

type AuthRequest = {
  user: {
    sub: string;
    role: UserRole;
  };
};

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(req.user.sub, dto);
  }

  @Get('my')
  findMy(@Request() req: AuthRequest) {
    return this.bookingsService.findByUser(req.user.sub);
  }

  @Get(':id')
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.bookingsService.findOne(id, req.user.sub, req.user.role);
  }

  @Patch(':id/cancel')
  cancel(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.bookingsService.cancel(id, req.user.sub);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @UseGuards(RoleGuard)
  updateStatus(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
  ) {
    return this.bookingsService.updateStatus(id, dto, req.user.role);
  }
}
