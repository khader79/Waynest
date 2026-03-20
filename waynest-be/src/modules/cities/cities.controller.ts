import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { CitiesService } from './cities.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('cities')
@SkipThrottle()
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Post('/getCities')
  getCities() {
    return this.citiesService.getCities();
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() createCityDto: CreateCityDto) {
    return this.citiesService.create(createCityDto);
  }

  @Get()
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 100) {
    return this.citiesService.findAll(Number(page), Number(limit));
  }

  @Get('by-country/:countryId')
  findByCountry(@Param('countryId') countryId: string) {
    return this.citiesService.findByCountry(countryId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.citiesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCityDto: UpdateCityDto) {
    return this.citiesService.update(id, updateCityDto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.citiesService.remove(id);
  }
}
