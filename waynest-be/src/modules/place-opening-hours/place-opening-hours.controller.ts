import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PlaceOpeningHoursService } from './place-opening-hours.service';
import { CreatePlaceOpeningHourDto } from './dto/create-place-opening-hour.dto';
import { UpdatePlaceOpeningHourDto } from './dto/update-place-opening-hour.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('place-opening-hours')
export class PlaceOpeningHoursController {
  constructor(
    private readonly placeOpeningHoursService: PlaceOpeningHoursService,
  ) {}

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
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
    return this.placeOpeningHoursService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePlaceOpeningHourDto: UpdatePlaceOpeningHourDto,
  ) {
    return this.placeOpeningHoursService.update(id, updatePlaceOpeningHourDto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.placeOpeningHoursService.remove(id);
  }
}
