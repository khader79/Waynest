/**
 * TripPlannerService
 * Core trip generation, saving, and retrieval functionality
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
<<<<<<< HEAD
import { Between, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
=======
import { Between, Repository, Not, In } from 'typeorm';
>>>>>>> 683ae08554c8a01eabdeed59e179f8e76aedb364
import { TripPlan, IGeneratedPlan } from './entities/trip-planner.entity';
import { CreateTripPlannerDto } from './dto/create-trip-planner.dto';
import { GeminiService } from './gemini.service';
import { ImageFetcherService } from './image-fetcher.service';
import { Place } from 'src/modules/place/entities/place.entity';
import { Event } from 'src/modules/event/entities/event.entity';
import { City } from 'src/modules/cities/entities/city.entity';
<<<<<<< HEAD
import { rateLimiter, RATE_LIMIT_PRESETS } from '../common/utils/rateLimiter';
=======

// In-memory rate limiting for trip generation (per IP/identifier)
// For production, use Redis for distributed rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit: 5 trip generations per 15 minutes per IP/guest token
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(identifier: string): void {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || now > record.resetTime) {
    // Start new window
    rateLimitStore.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    const remainingMs = record.resetTime - now;
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    throw new HttpException(
      `Too many trip plans generated. Please wait ${remainingMinutes} minute(s) before generating another plan.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  
  record.count++;
  rateLimitStore.set(identifier, record);
}

function generateShareSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 10; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

function canAccessTrip(
  tripPlan: TripPlan,
  userId?: string | null,
  guestToken?: string | null,
) {
  if (userId && tripPlan.userId === userId) {
    return true;
  }

  if (!tripPlan.userId && guestToken && tripPlan.guestToken === guestToken) {
    return true;
  }

  return false;
}

function getShareUrl(slug: string) {
  return `${process.env.FRONTEND_URL || 'https://waynest.com'}/trip/${slug}`;
}
>>>>>>> 683ae08554c8a01eabdeed59e179f8e76aedb364

export type TripPlanSummary = {
  id: string;
  cityId: string;
  days: number;
  budget: number;
  persons: number;
  createdAt: Date;
  totalEstimatedCost?: number;
  shareSlug?: string | null;
  isPublic?: boolean;
  title?: string | null;
  description?: string | null;
};

function generateGuestToken(): string {
  return randomUUID().replace(/-/g, '');
}

@Injectable()
export class TripPlannerService {
  constructor(
    @InjectRepository(TripPlan) private tripPlanRepo: Repository<TripPlan>,
    @InjectRepository(City) private cityRepo: Repository<City>,
    @InjectRepository(Place) private placeRepo: Repository<Place>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    private geminiService: GeminiService,
    private imageFetcher: ImageFetcherService,
  ) {}

  async findByUser(userId: string): Promise<TripPlanSummary[]> {
    const plans = await this.tripPlanRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return plans.map((plan) => ({
      id: plan.id,
      cityId: plan.cityId,
      days: plan.days,
      budget: Number(plan.budget),
      persons: plan.persons,
      createdAt: plan.createdAt,
      totalEstimatedCost: plan.generatedPlan?.totalEstimatedCost,
      shareSlug: plan.shareSlug,
      isPublic: plan.isPublic,
      title: plan.title,
      description: plan.description,
    }));
  }

  async findOne(id: string, userId: string): Promise<TripPlan> {
    const tripPlan = await this.tripPlanRepo.findOne({ where: { id } });

    if (!tripPlan) {
      throw new NotFoundException('Trip plan not found');
    }

    if (tripPlan.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return tripPlan;
  }

  async remove(id: string, userId: string): Promise<{ success: true }> {
    const tripPlan = await this.tripPlanRepo.findOne({ where: { id } });

    if (!tripPlan) {
      throw new NotFoundException('Trip plan not found');
    }

    if (tripPlan.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.tripPlanRepo.remove(tripPlan);

    return { success: true };
  }

  async generate(userId: string | null, dto: CreateTripPlannerDto, rateLimitKey?: string) {
    // Apply rate limiting if key provided
    if (rateLimitKey) {
      rateLimiter.checkLimit(rateLimitKey, RATE_LIMIT_PRESETS.TRIP_GENERATION);
    }
    
    const city = await this.cityRepo.findOne({
      where: { id: dto.cityId },
    });

    if (!city) {
      throw new NotFoundException('Destination not found');
    }

    const places = await this.placeRepo.find({
      where: { city: { id: city.id }, isActive: true },
      relations: ['pricings', 'openingHours', 'tags'],
    });

    const filteredPlaces = dto.interests?.length
      ? places.filter((p) =>
          p.tags.some((t) =>
            dto
              .interests!.map((i) => i.toLowerCase())
              .includes(t.name.toLowerCase()),
          ),
        )
      : places;

    if (filteredPlaces.length === 0) {
      throw new BadRequestException(`No active places found for ${city.name}.`);
    }

    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + dto.days);

    const events = await this.eventRepo.find({
      where: { isActive: true, startDate: Between(today, endDate) },
      relations: ['venue', 'venue.city'],
    });

    const cityEvents = events.filter((e) => e.venue?.city?.id === city.id);

    await Promise.all(
      filteredPlaces.map((p) => this.imageFetcher.ensureImage(p)),
    );

    const updatedPlaces = await this.placeRepo.find({
      where: { city: { id: city.id }, isActive: true },
      relations: ['pricings', 'openingHours', 'tags'],
    });

    const budgetPerPersonPerDay = dto.budget / dto.persons / dto.days;
    const destinationName = city.stateName
      ? `${city.name} (${city.stateName})`
      : city.name;

    const context = {
      cityId: city.id,
      destinationName,
      days: dto.days,
      budget: dto.budget,
      persons: dto.persons,
      budgetPerPersonPerDay: Math.round(budgetPerPersonPerDay),
      places: updatedPlaces.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        rating: p.ratingAverage,
        imageUrl: p.imageUrl ?? null,
        tags: p.tags.map((t) => t.name),
        price: p.pricings[0]?.basePrice ?? 0,
        currency: p.pricings[0]?.currencyCode ?? 'ILS',
        perPerson: p.pricings[0]?.perPerson ?? false,
        openingHours: p.openingHours.map((h) => ({
          day: h.dayOfWeek,
          open: h.openTime,
          close: h.closeTime,
        })),
      })),
      events: cityEvents.map((e) => ({
        id: e.id,
        name: e.title,
        price: e.ticketPrice,
        currency: e.currencyCode,
        startDate: e.startDate,
        endDate: e.endDate,
        venue: e.venue?.name,
        imageUrl: e.venue?.imageUrl ?? null,
      })),
    };

    let generatedPlan: IGeneratedPlan;

    try {
      generatedPlan = await this.geminiService.generateTripPlan(context);
    } catch {
      throw new InternalServerErrorException(
        'AI service unavailable. Please try again.',
      );
    }

    if (!userId) {
      // Guest users can generate and view plans, but plans are not persisted.
      return { tripPlanId: null, persisted: false, ...generatedPlan };
    }

    const tripPlan = this.tripPlanRepo.create({
      userId,
      cityId: city.id,
      days: dto.days,
      budget: dto.budget,
      persons: dto.persons,
      generatedPlan,
    });

    await this.tripPlanRepo.save(tripPlan);

    return { tripPlanId: tripPlan.id, persisted: true, ...generatedPlan };
  }
}
