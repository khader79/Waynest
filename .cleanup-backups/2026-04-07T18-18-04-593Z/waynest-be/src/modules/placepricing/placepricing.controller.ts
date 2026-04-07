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
import { PlacepricingService } from './placepricing.service';
import { CreatePlacepricingDto } from './dto/create-placepricing.dto';
import { UpdatePlacepricingDto } from './dto/update-placepricing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('placepricing')
export class PlacepricingController {
  constructor(private readonly placepricingService: PlacepricingService) {}

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() createPlacepricingDto: CreatePlacepricingDto) {
    return this.placepricingService.create(createPlacepricingDto);
  }

  @Get()
  findAll() {
    return this.placepricingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.placepricingService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePlacepricingDto: UpdatePlacepricingDto,
  ) {
    return this.placepricingService.update(id, updatePlacepricingDto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.placepricingService.remove(id);
  }
}
