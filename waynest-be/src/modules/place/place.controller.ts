import {
  BadRequestException,
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

import { PlaceService } from './place.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('place')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() createPlaceDto: CreatePlaceDto) {
    return this.placeService.create(createPlaceDto);
  }

  /**
   * Admin: fetch Google Places images for all active places that have none.
   * This is a long-running operation — it runs to completion and returns stats.
   * POST /place/backfill-images
   */
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Post('backfill-images')
  backfillImages() {
    return this.placeService.backfillMissingImages();
  }

  /**
   * Admin: fetch accurate GPS coordinates from Google Places for every
   * active place that is missing latitude/longitude.
   * POST /place/backfill-coordinates
   */
  /**
   * Admin: update GPS coordinates from Google Places.
   * POST /place/backfill-coordinates?force=true  → updates ALL places
   * POST /place/backfill-coordinates             → only places missing lat/lng
   */
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Post('backfill-coordinates')
  backfillCoordinates(@Query('force') force?: string) {
    return this.placeService.backfillCoordinates(force === 'true');
  }

  @Get()
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 100,
    @Query('country') country?: string,
    @Query('city') city?: string,
    @Query('cursor') cursor?: string,
    @Query('q') q?: string,
  ) {
    return this.placeService.findAll(
      Number(page),
      Number(limit),
      country,
      city,
      cursor,
      q,
    );
  }

  /** Nearest active places (for “my location” in composer). Must stay above :id. */
  @Get('nearest')
  findNearest(
    @Query('lat') latRaw: string,
    @Query('lng') lngRaw: string,
    @Query('limit') limitRaw?: string,
  ) {
    const lat = parseFloat(latRaw);
    const lng = parseFloat(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('lat and lng must be valid numbers');
    }
    const limit = limitRaw ? parseInt(limitRaw, 10) : 5;
    return this.placeService.findNearest(
      lat,
      lng,
      Number.isFinite(limit) ? limit : 5,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.placeService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlaceDto: UpdatePlaceDto) {
    return this.placeService.update(id, updatePlaceDto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.placeService.remove(id);
  }
}
