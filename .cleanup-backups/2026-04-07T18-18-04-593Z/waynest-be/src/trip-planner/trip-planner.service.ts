/**
 * TripPlannerService
 * Core trip generation, saving, and retrieval functionality
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  TripPlan,
  IGeneratedPlan,
  ITripDay,
  ITripSlot,
} from './entities/trip-planner.entity';
import { CreateTripPlannerDto } from './dto/create-trip-planner.dto';
import { GeminiService } from './gemini.service';
import { ImageFetcherService } from './image-fetcher.service';
import { Place } from 'src/modules/place/entities/place.entity';
import { Event } from 'src/modules/event/entities/event.entity';
import { City } from 'src/modules/cities/entities/city.entity';
import { rateLimiter, RATE_LIMIT_PRESETS } from '../common/utils/rateLimiter';

export type TripPlanSummary = {
  id: string;
  cityId: string;
  /** Resolved city name for UI labels (avoids raw UUIDs in titles). */
  cityName?: string | null;
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

/** Public browse cards for search hub — no internal user/plan ids. */
export type PublicTripBrowseItem = {
  shareSlug: string;
  title: string | null;
  username: string;
  cityId: string;
  createdAt: Date;
};

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
      relations: ['city'],
      order: { createdAt: 'DESC' },
    });

    return plans.map((plan) => ({
      id: plan.id,
      cityId: plan.cityId,
      cityName: plan.city?.name?.trim() || null,
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

  async findPublicBrowse(
    limit: number,
  ): Promise<{ items: PublicTripBrowseItem[] }> {
    const take = Math.min(Math.max(limit, 1), 24);
    const rows = await this.tripPlanRepo
      .createQueryBuilder('plan')
      .innerJoinAndSelect('plan.user', 'owner')
      .where('plan.isPublic = :pub', { pub: true })
      .andWhere('plan.shareSlug IS NOT NULL')
      .andWhere("plan.shareSlug != ''")
      .andWhere('plan.userId IS NOT NULL')
      .orderBy('plan.createdAt', 'DESC')
      .take(take)
      .getMany();

    const items: PublicTripBrowseItem[] = rows
      .filter((p) => p.shareSlug && p.user)
      .map((p) => ({
        shareSlug: p.shareSlug as string,
        title: p.title,
        username: p.user?.username?.trim() || 'traveler',
        cityId: p.cityId,
        createdAt: p.createdAt,
      }));

    return { items };
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

  async generate(
    userId: string | null,
    dto: CreateTripPlannerDto,
    rateLimitKey?: string,
  ) {
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

    const selectedPlaceIds = new Set(filteredPlaces.map((p) => p.id));
    const updatedPlaces = await this.placeRepo.find({
      where: { city: { id: city.id }, isActive: true },
      relations: ['pricings', 'openingHours', 'tags'],
    });

    const budgetPerPersonPerDay = dto.budget / dto.persons / dto.days;
    const destinationName = city.stateName
      ? `${city.name} (${city.stateName})`
      : city.name;
    const normalizeOpeningHours = (
      openingHours: (typeof updatedPlaces)[number]['openingHours'],
    ) =>
      openingHours
        .filter(
          (
            h,
          ): h is typeof h & {
            dayOfWeek: number;
          } => h.dayOfWeek !== null,
        )
        .map((h) => ({
          day: h.dayOfWeek,
          open: h.openTime,
          close: h.closeTime,
        }));

    const context = {
      cityId: city.id,
      destinationName,
      days: dto.days,
      budget: dto.budget,
      persons: dto.persons,
      budgetPerPersonPerDay: Math.round(budgetPerPersonPerDay),
      places: updatedPlaces
        .filter((p) => selectedPlaceIds.has(p.id))
        .map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          rating: p.ratingAverage,
          imageUrl: p.imageUrl ?? null,
          tags: p.tags.map((t) => t.name),
          price: p.pricings[0]?.basePrice ?? 0,
          currency: p.pricings[0]?.currencyCode ?? 'ILS',
          perPerson: p.pricings[0]?.perPerson ?? false,
          openingHours: normalizeOpeningHours(p.openingHours),
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
      generatedPlan = this.buildRuleBasedPlan(context);
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

  /**
   * Non-functional requirement: if the generative AI service is down, still return a
   * valid itinerary from platform data (rotating highly-rated places; optional event on day 1).
   */
  private buildRuleBasedPlan(context: {
    destinationName: string;
    days: number;
    budget: number;
    persons: number;
    places: Array<{
      id: string;
      name: string;
      type?: string;
      rating?: number;
      price: number;
      perPerson?: boolean;
      openingHours: Array<{
        day: number;
        open: string | null;
        close: string | null;
      }>;
    }>;
    events: Array<{ id: string; name: string; price: number }>;
  }): IGeneratedPlan {
    const {
      days: numDays,
      places,
      events,
      persons,
      budget,
      destinationName,
    } = context;

    const estimate = (p: (typeof places)[0]) =>
      p.perPerson
        ? Math.round((Number(p.price) || 0) * persons)
        : Math.round(Number(p.price) || 0);

    const slotFromPlace = (p: (typeof places)[0]): ITripSlot => {
      const oh = p.openingHours?.[0];
      return {
        placeId: p.id,
        name: p.name,
        type: p.type,
        duration: '2–3 hours',
        estimatedCost: estimate(p),
        openTime: oh?.open,
        closeTime: oh?.close,
      };
    };

    const buildDays = (pool: typeof places): ITripDay[] => {
      const byRating = [...pool].sort(
        (a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0),
      );
      const byCost = [...pool].sort((a, b) => estimate(a) - estimate(b));
      let order = byRating;
      let idx = 0;
      const next = () => {
        const p = order[idx % order.length];
        idx++;
        return p;
      };

      const daysOut: ITripDay[] = [];
      let eventUsed = 0;

      const pushDay = (d: number) => {
        const morning = slotFromPlace(next());
        let afternoon: ITripSlot;
        if (d === 1 && events.length > eventUsed) {
          const ev = events[eventUsed++];
          afternoon = {
            name: ev.name,
            duration: '2 hours',
            estimatedCost: Math.round((Number(ev.price) || 0) * persons),
          };
        } else {
          afternoon = slotFromPlace(next());
        }
        const evening = slotFromPlace(next());
        const totalDayCost =
          morning.estimatedCost +
          afternoon.estimatedCost +
          evening.estimatedCost;
        daysOut.push({
          day: d,
          morning,
          afternoon,
          evening,
          totalDayCost,
        });
      };

      for (let d = 1; d <= numDays; d++) {
        pushDay(d);
      }

      let total = daysOut.reduce((s, day) => s + day.totalDayCost, 0);
      if (total > budget && byCost.length) {
        daysOut.length = 0;
        idx = 0;
        order = byCost;
        eventUsed = 0;
        for (let d = 1; d <= numDays; d++) {
          pushDay(d);
        }
        total = daysOut.reduce((s, day) => s + day.totalDayCost, 0);
      }

      return daysOut;
    };

    const days = buildDays(places);
    const totalEstimatedCost = days.reduce((s, d) => s + d.totalDayCost, 0);

    const tips: string[] = [
      'This itinerary was assembled automatically while the AI planner was unavailable. Double-check opening hours and prices.',
      `Destination: ${destinationName}.`,
    ];
    if (totalEstimatedCost > budget) {
      tips.push(
        'Estimated costs exceed your stated budget — adjust venues, trip length, or budget.',
      );
    }

    return {
      days,
      totalEstimatedCost,
      tips,
    };
  }
}
