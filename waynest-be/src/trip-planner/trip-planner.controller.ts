import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Ip,
  Optional,
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
import { MediaEnrichmentService } from './media-enrichment.service';
import { CreateTripPlannerDto } from './dto/create-trip-planner.dto';
import { SaveGeneratedPlanDto } from './dto/save-generated-plan.dto';
import { ShareTripDto } from './dto/trip-sharing.dto';
import { ReplanDayDto } from './dto/replan-day.dto';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../modules/auth/guards/optional-jwt-auth.guard';
import { CreditGuard } from '../modules/credits/guards/credit.guard';
import { RequiresCredits } from '../common/decorators/requires-credits.decorator';
import { ItineraryQueueService } from '../jobs/itinerary-queue.service';
import { CreditEngineService } from '../modules/credits/credit-engine.service';

const AI_TRIP_GENERATION_CREDIT_COST = 5;

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
    private readonly mediaEnrichment: MediaEnrichmentService,
    @Optional()
    private readonly itineraryQueueService: ItineraryQueueService | null,
    private readonly creditEngine: CreditEngineService,
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

  /**
   * Proxy a Google Places photo through our server so the API key is never
   * exposed to clients and images load without CORS issues.
   * GET /trip-planner/photos/proxy?ref=<photo_reference>&maxwidth=800
   */
  @Get('photos/proxy')
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  async proxyPlacePhoto(
    @Query('ref') photoRef: string,
    @Query('maxwidth') maxwidthStr: string,
    @Res() res: Response,
  ) {
    if (!photoRef || typeof photoRef !== 'string' || photoRef.length > 3000) {
      return res.status(400).json({ message: 'Invalid photo reference' });
    }
    const maxwidth = Math.min(Math.max(Number(maxwidthStr) || 800, 100), 1600);
    const result = await this.mediaEnrichment.proxyPhoto(photoRef, maxwidth);
    if (!result) {
      return res.status(404).end();
    }
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.end(result.buffer);
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
  @HttpCode(202)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseGuards(OptionalJwtAuthGuard)
  async generate(
    @Body() dto: CreateTripPlannerDto,
    @Request() req: AuthRequest,
    @Ip() ip: string,
  ) {
    const userId = req.user?.sub ?? null;
    const rateLimitKey = userId || ip || 'unknown';

    // Quick credit check before queueing
    if (userId) {
      const available = await this.creditEngine.getAvailableBalance(userId);
      if (BigInt(available) < BigInt(AI_TRIP_GENERATION_CREDIT_COST)) {
        throw new BadRequestException(
          'Insufficient credits. Upgrade your plan or wait for monthly reset to generate more trip plans.',
        );
      }
    }

    if (this.itineraryQueueService) {
      const jobId = await this.itineraryQueueService.addGenerateJob({
        userId,
        dto,
        rateLimitKey,
      });
      return { jobId, status: 'queued' };
    }

    const result = await this.tripPlannerService.generate(
      userId,
      dto,
      rateLimitKey,
    );
    return result;
  }

  @Get('jobs/:jobId')
  async getJobResult(@Param('jobId') jobId: string) {
    if (!this.itineraryQueueService) {
      throw new BadRequestException('Job queue is not available');
    }
    const result = await this.itineraryQueueService.getJobResult(jobId);
    return result;
  }

  /** Re-sync a saved trip plan's days into the user's calendar. */
  @Post(':id/sync-calendar')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async syncToCalendar(
    @Param('id') id: string,
    @Request() req: AuthRequest,
  ) {
    return this.tripPlannerService.syncToCalendar(id, req.user?.sub ?? '');
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, CreditGuard)
  @RequiresCredits(5)
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

  @Get(':id/map-data')
  @UseGuards(OptionalJwtAuthGuard)
  getMapData(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.tripPlannerService.getMapData(id, req.user?.sub ?? null);
  }

  /**
   * Get coordinates for a list of place IDs (for unsaved/guest trips).
   * Body: { placeIds: string[], cityId?: string }
   */
  @Post('map-data/by-ids')
  @HttpCode(200)
  @UseGuards(OptionalJwtAuthGuard)
  getMapDataByIds(
    @Body() body: { placeIds?: string[]; cityId?: string },
  ) {
    return this.tripPlannerService.getMapDataByPlaceIds(
      body.placeIds ?? [],
      body.cityId,
    );
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

  /**
   * Dynamically replan a single day of an existing trip.
   * Only the target day is rebuilt — all other days are preserved.
   */
  @Post(':id/replan-day')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  replanDay(
    @Param('id') id: string,
    @Body() dto: ReplanDayDto,
    @Request() req: AuthRequest,
  ) {
    return this.tripPlannerService.replanDay(
      id,
      req.user?.sub ?? '',
      dto.dayNumber,
      dto.reason,
    );
  }
}
