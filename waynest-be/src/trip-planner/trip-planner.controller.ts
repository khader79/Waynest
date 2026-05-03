import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Ip,
  Param,
  Post,
  Put,
  Query,
  Res,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { TripPlannerService } from './trip-planner.service';
import { SharingService } from './sharing.service';
import { CreateTripPlannerDto } from './dto/create-trip-planner.dto';
import { SaveGeneratedPlanDto } from './dto/save-generated-plan.dto';
import { ShareTripDto } from './dto/trip-sharing.dto';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../modules/auth/guards/optional-jwt-auth.guard';

interface AuthRequest {
  user?: {
    sub: string;
  };
}

@Controller('trip-planner')
export class TripPlannerController {
  constructor(
    private readonly tripPlannerService: TripPlannerService,
    private readonly sharingService: SharingService,
  ) {}

  @Get('public/browse')
  browsePublic(@Query('limit') limitStr?: string) {
    let n = Number.parseInt(limitStr ?? '12', 10);
    if (!Number.isFinite(n) || n < 1) {
      n = 12;
    }
    if (n > 24) {
      n = 24;
    }
    return this.tripPlannerService.findPublicBrowse(n);
  }

  @Get('ai/health')
  async aiHealth() {
    return this.tripPlannerService.aiHealth();
  }

  @Get('public/:slug/og-image')
  @UseGuards(OptionalJwtAuthGuard)
  async getPublicTripOgImage(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) res: Response,
    @Request() req: AuthRequest,
  ) {
    const trip = await this.sharingService.getPublicTripPreview(
      slug,
      req.user?.sub ?? null,
    );
    res.type('image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    return this.sharingService.renderPublicTripOgImage(trip);
  }

  @Get('public/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  async getPublicTrip(
    @Param('slug') slug: string,
    @Headers('x-trip-guest-token') guestToken: string | undefined,
    @Request() req: AuthRequest,
    @Ip() ip: string,
  ) {
    return this.sharingService.getPublicTrip(
      slug,
      req.user?.sub ?? null,
      guestToken,
      ip,
    );
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseGuards(OptionalJwtAuthGuard)
  async generate(
    @Body() dto: CreateTripPlannerDto,
    @Request() req: AuthRequest,
    @Ip() ip: string,
  ) {
    const rateLimitKey = req.user?.sub || ip || 'unknown';
    return this.tripPlannerService.generate(
      req.user?.sub ?? null,
      dto,
      rateLimitKey,
    );
  }

  @Post('import')
  @UseGuards(JwtAuthGuard)
  async importGenerated(
    @Body() dto: SaveGeneratedPlanDto,
    @Request() req: AuthRequest,
  ) {
    // Persist the provided generatedPlan for the authenticated user
    const tripPlan = await this.tripPlannerService.createFromGenerated(
      req.user?.sub ?? '',
      dto,
    );
    return tripPlan;
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
    return this.sharingService.shareTrip(
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
    return this.sharingService.copyTrip(id, req.user?.sub ?? null, guestToken);
  }

  @Put(':id/toggle-public')
  @UseGuards(OptionalJwtAuthGuard)
  togglePublic(
    @Param('id') id: string,
    @Headers('x-trip-guest-token') guestToken: string | undefined,
    @Request() req: AuthRequest,
  ) {
    return this.sharingService.togglePublic(
      id,
      req.user?.sub ?? null,
      guestToken,
    );
  }
}
