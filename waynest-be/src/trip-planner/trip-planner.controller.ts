import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Res,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { TripPlannerService } from './trip-planner.service';
import { CreateTripPlannerDto } from './dto/create-trip-planner.dto';
import { ShareTripDto } from './dto/trip-sharing.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from 'src/modules/auth/guards/optional-jwt-auth.guard';

type AuthRequest = {
  user?: {
    sub: string;
  };
};

@Controller('trip-planner')
export class TripPlannerController {
  constructor(private readonly tripPlannerService: TripPlannerService) {}

  @Get('public/:slug')
  getPublicTrip(@Param('slug') slug: string) {
    return this.tripPlannerService.getPublicTrip(slug);
  }

  @Get('public/:slug/og-image')
  async getPublicTripOgImage(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const trip = await this.tripPlannerService.getPublicTripPreview(slug);
    res.type('image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    return this.tripPlannerService.renderPublicTripOgImage(trip);
  }

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  generate(@Body() dto: CreateTripPlannerDto, @Request() req: AuthRequest) {
    return this.tripPlannerService.generate(req.user?.sub ?? null, dto);
  }

  @Get('my-plans')
  @UseGuards(JwtAuthGuard)
  myPlans(@Request() req: AuthRequest) {
    return this.tripPlannerService.findByUser(req.user?.sub ?? '');
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getOne(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.tripPlannerService.findOne(id, req.user?.sub ?? '');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.tripPlannerService.remove(id, req.user?.sub ?? '');
  }

  @Post(':id/share')
  @UseGuards(OptionalJwtAuthGuard)
  shareTrip(
    @Param('id') id: string,
    @Body() dto: ShareTripDto,
    @Headers('x-trip-guest-token') guestToken: string | undefined,
    @Request() req: AuthRequest,
  ) {
    return this.tripPlannerService.shareTrip(
      id,
      req.user?.sub ?? null,
      guestToken,
      dto,
    );
  }

  @Post(':id/copy')
  @UseGuards(OptionalJwtAuthGuard)
  copyTrip(
    @Param('id') id: string,
    @Headers('x-trip-guest-token') guestToken: string | undefined,
    @Request() req: AuthRequest,
  ) {
    return this.tripPlannerService.copyTrip(
      id,
      req.user?.sub ?? null,
      guestToken,
    );
  }

  @Put(':id/toggle-public')
  @UseGuards(OptionalJwtAuthGuard)
  togglePublic(
    @Param('id') id: string,
    @Headers('x-trip-guest-token') guestToken: string | undefined,
    @Request() req: AuthRequest,
  ) {
    return this.tripPlannerService.togglePublic(
      id,
      req.user?.sub ?? null,
      guestToken,
    );
  }
}
