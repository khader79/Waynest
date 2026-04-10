/**
 * TripPlannerService
 * Core trip generation, saving, and retrieval functionality
 */

import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import {
  TripPlan,
  IGeneratedPlan,
  ITripDay,
  ITripSlot,
} from './entities/trip-planner.entity';
import { CreateTripPlannerDto } from './dto/create-trip-planner.dto';
import { GeminiQuotaExceededError, GeminiService } from './gemini.service';
import { ImageFetcherService } from './image-fetcher.service';
import { Place } from 'src/modules/place/entities/place.entity';
import { Event } from 'src/modules/event/entities/event.entity';
import { City } from 'src/modules/cities/entities/city.entity';
import { rateLimiter, RATE_LIMIT_PRESETS } from '../common/utils/rateLimiter';

type NormalizedPlacePricing = {
  price: number;
  currency: string;
  perPerson: boolean;
  estimated: boolean;
};

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
  private readonly logger = new Logger(TripPlannerService.name);

  constructor(
    @InjectRepository(TripPlan) private tripPlanRepo: Repository<TripPlan>,
    @InjectRepository(City) private cityRepo: Repository<City>,
    @InjectRepository(Place) private placeRepo: Repository<Place>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    private geminiService: GeminiService,
    private imageFetcher: ImageFetcherService,
  ) {}

  private getHeuristicEstimatedPrice(
    place: {
      type?: string;
      rating?: number | string;
    },
    persons: number,
  ): { price: number; perPerson: boolean } {
    const normalizedPersons = Math.max(1, Number(persons) || 1);
    const rating = Number(place.rating ?? 0) || 0;
    const type = this.normalizeText(place.type);

    const baseByType: Record<string, number> = {
      cafe: 25,
      restaurant: 60,
      activity: 45,
      tour: 50,
      park: 15,
      shop: 30,
      landmark: 20,
      hotel: 320,
    };

    const base = baseByType[type] ?? 40;
    const ratingFactor = Math.max(0.8, Math.min(1.35, 0.9 + rating / 10));
    const perPerson =
      type === 'restaurant' ||
      type === 'cafe' ||
      type === 'activity' ||
      type === 'tour';

    const unit = Math.round(base * ratingFactor);
    return {
      perPerson,
      price: perPerson
        ? unit
        : Math.round(unit * Math.max(1, normalizedPersons / 3)),
    };
  }

  /**
   * Expose AI service health for diagnostics.
   */
  async aiHealth() {
    try {
      const res = await this.geminiService.healthCheck();
      return res;
    } catch (err) {
      return { ok: false, detail: String(err ?? 'unknown error') };
    }
  }

  private async normalizePlacePricings(
    places: Array<{
      id: string;
      name: string;
      type?: string;
      ratingAverage?: number | string;
      tags: Array<{ name: string }>;
      pricings: Array<{
        basePrice: number | string;
        currencyCode?: string;
        perPerson?: boolean;
        maxPeople?: number;
      }>;
    }>,
    destinationName: string,
    persons: number,
  ): Promise<Map<string, NormalizedPlacePricing>> {
    const normalizedPersons = Math.max(1, Number(persons) || 1);
    const pricingByPlace = new Map<string, NormalizedPlacePricing>();

    const toEstimate = places.filter((p) => {
      const candidates = Array.isArray(p.pricings) ? p.pricings : [];
      const valid = candidates.find((pr) => {
        const base = Number(pr.basePrice ?? 0);
        const maxPeople = pr.maxPeople == null ? null : Number(pr.maxPeople);
        const capacityOk = maxPeople == null || maxPeople >= normalizedPersons;
        return Number.isFinite(base) && base > 0 && capacityOk;
      });

      if (valid) {
        pricingByPlace.set(p.id, {
          price: Number(valid.basePrice),
          currency: (valid.currencyCode ?? 'ILS').toUpperCase(),
          perPerson: Boolean(valid.perPerson),
          estimated: false,
        });
        return false;
      }

      return true;
    });

    if (toEstimate.length === 0) {
      return pricingByPlace;
    }

    let aiEstimates: Record<
      string,
      { estimatedPrice: number; perPerson: boolean }
    > = {};
    const useAiPriceEstimates =
      String(process.env.TRIP_PLANNER_AI_PRICE_ESTIMATE ?? 'false') === 'true';
    if (useAiPriceEstimates) {
      try {
        const response = await this.geminiService.estimatePlacePrices({
          destinationName,
          persons: normalizedPersons,
          places: toEstimate.map((p) => ({
            id: p.id,
            name: p.name,
            type: p.type,
            tags: p.tags.map((t) => t.name),
            rating: Number(p.ratingAverage ?? 0) || 0,
            currency: 'ILS',
            referencePrice: undefined,
          })),
        });
        aiEstimates = response as Record<
          string,
          { estimatedPrice: number; perPerson: boolean }
        >;
      } catch (err) {
        this.logger.warn(
          `AI price estimation failed, using heuristics: ${String(err)}`,
        );
        aiEstimates = {};
      }
    }

    for (const place of toEstimate) {
      const ai = aiEstimates?.[place.id];
      const aiPrice = Number(ai?.estimatedPrice ?? 0);
      if (Number.isFinite(aiPrice) && aiPrice > 0) {
        pricingByPlace.set(place.id, {
          price: Math.round(aiPrice),
          currency: 'ILS',
          perPerson: Boolean(ai?.perPerson),
          estimated: true,
        });
        continue;
      }

      const heuristic = this.getHeuristicEstimatedPrice(
        { type: place.type, rating: place.ratingAverage },
        normalizedPersons,
      );
      pricingByPlace.set(place.id, {
        price: heuristic.price,
        currency: 'ILS',
        perPerson: heuristic.perPerson,
        estimated: true,
      });
    }

    return pricingByPlace;
  }

  private getPlannerWindow(
    baseDate: Date,
    days: number,
  ): {
    start: Date;
    end: Date;
  } {
    const safeDays = Math.max(1, Number(days) || 1);
    const start = new Date(baseDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + safeDays - 1);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  private normalizeText(value?: string | null): string {
    return (value ?? '').trim().toLowerCase();
  }

  private async findCityEventsInWindow(
    cityMatcher: {
      id: string;
      name?: string | null;
      stateName?: string | null;
    },
    windowStart: Date,
    windowEnd: Date,
    allowedVenueIds?: Set<string>,
  ): Promise<Event[]> {
    const venueIds = Array.from(allowedVenueIds ?? []);

    const runQuery = async (activeOnly: boolean): Promise<Event[]> => {
      const qb = this.eventRepo
        .createQueryBuilder('e')
        .leftJoinAndSelect('e.venue', 'v')
        .leftJoinAndSelect('v.city', 'vc')
        .leftJoinAndSelect('v.provider', 'vp')
        .leftJoinAndSelect('vp.city', 'pc')
        .where('e.startDate <= :windowEnd', { windowEnd })
        .andWhere('e.endDate >= :windowStart', { windowStart });

      if (activeOnly) {
        qb.andWhere('e.isActive = true');
      }

      const hasVenueIds = venueIds.length > 0;
      if (hasVenueIds) {
        qb.andWhere(
          '(v.id IN (:...venueIds) OR v.cityId = :cityId OR vp.cityId = :cityId)',
          {
            venueIds,
            cityId: cityMatcher.id,
          },
        );
      } else {
        qb.andWhere('(v.cityId = :cityId OR vp.cityId = :cityId)', {
          cityId: cityMatcher.id,
        });
      }

      return qb.orderBy('e.startDate', 'ASC').getMany();
    };

    const activeRows = await runQuery(true);
    if (activeRows.length > 0) {
      return activeRows;
    }

    const fallbackRows = await runQuery(false);
    if (fallbackRows.length > 0) {
      return fallbackRows;
    }

    return [];
  }

  private formatTimeOfDay(d?: Date | string | null): string | undefined {
    if (!d) return undefined;
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return undefined;
    return dt.toISOString().split('T')[1]?.slice(0, 8);
  }

  private injectEventsIntoPlan(
    generatedPlan: IGeneratedPlan,
    cityEvents: Event[],
    persons: number,
    tripStartDate: Date,
  ): IGeneratedPlan {
    if (!Array.isArray(generatedPlan?.days) || cityEvents.length === 0) {
      return generatedPlan;
    }

    const eventsQueue = cityEvents.slice();
    for (
      let di = 0;
      di < generatedPlan.days.length && eventsQueue.length;
      di++
    ) {
      const day = generatedPlan.days[di];
      if (!day) continue;

      const dayStart = new Date(tripStartDate);
      dayStart.setDate(dayStart.getDate() + di);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const hasEventAlready = ['morning', 'afternoon', 'evening'].some(
        (slotName) => (day as any)[slotName]?.type === 'EVENT',
      );
      if (hasEventAlready) continue;

      const eventIndex = eventsQueue.findIndex(
        (ev) =>
          new Date(ev.startDate).getTime() <= dayEnd.getTime() &&
          new Date(ev.endDate).getTime() >= dayStart.getTime(),
      );
      if (eventIndex < 0) continue;

      const [ev] = eventsQueue.splice(eventIndex, 1);
      const price = Number(ev.ticketPrice ?? 0) || 0;
      const estimated = Math.round(price * Math.max(1, Number(persons) || 1));

      const putEvent = (
        slotName: 'morning' | 'afternoon' | 'evening',
        allowReplace = false,
      ) => {
        const current = day[slotName] as ITripSlot | undefined;
        if (current?.type === 'EVENT') return false;
        if (!allowReplace && current?.placeId) return false;

        const currentCost = Number(current?.estimatedCost ?? 0) || 0;
        day[slotName] = {
          placeId: ev.venue?.id ?? ev.id,
          eventId: ev.id,
          name: (ev.title ?? ev.slug ?? ev.id) as string,
          type: 'EVENT',
          duration: '2 hours',
          estimatedCost: estimated,
          ticketPrice: price,
          persons: Math.max(1, Number(persons) || 1),
          currencyCode: ev.currencyCode ?? 'ILS',
          openTime: this.formatTimeOfDay(ev.startDate),
          closeTime: this.formatTimeOfDay(ev.endDate),
        };

        day.totalDayCost = (day.totalDayCost ?? 0) - currentCost + estimated;
        return true;
      };

      // Prefer non-destructive insertion first, then replace afternoon slot as fallback.
      if (putEvent('afternoon')) continue;
      if (putEvent('morning')) continue;
      if (putEvent('evening')) continue;
      putEvent('afternoon', true);
    }

    generatedPlan.totalEstimatedCost = generatedPlan.days.reduce(
      (sum, d) => sum + (d.totalDayCost ?? 0),
      0,
    );

    return generatedPlan;
  }

  private normalizeEventSlotCosts(
    generatedPlan: IGeneratedPlan,
    cityEvents: Event[],
    persons: number,
  ): IGeneratedPlan {
    if (!Array.isArray(generatedPlan?.days) || cityEvents.length === 0) {
      return generatedPlan;
    }

    const normalizedPersons = Math.max(1, Number(persons) || 1);
    const byVenueId = new Map<string, Event>();
    const byEventId = new Map<string, Event>();
    const byTitle = new Map<string, Event>();

    for (const ev of cityEvents) {
      if (ev.venue?.id) byVenueId.set(ev.venue.id, ev);
      if (ev.id) byEventId.set(ev.id, ev);
      if (ev.title) byTitle.set(this.normalizeText(ev.title), ev);
    }

    const resolveEvent = (slot: ITripSlot): Event | undefined => {
      if (slot.placeId) {
        const byVenue = byVenueId.get(slot.placeId);
        if (byVenue) return byVenue;
        const byId = byEventId.get(slot.placeId);
        if (byId) return byId;
      }

      if (slot.eventId) {
        const byEvent = byEventId.get(slot.eventId);
        if (byEvent) return byEvent;
      }

      const nameKey = this.normalizeText(slot.name);
      if (nameKey) {
        return byTitle.get(nameKey);
      }

      if (cityEvents.length === 1) {
        return cityEvents[0];
      }

      return undefined;
    };

    for (const day of generatedPlan.days) {
      for (const slotName of ['morning', 'afternoon', 'evening'] as const) {
        const slot = day[slotName] as ITripSlot | undefined;
        if (!slot) continue;
        if (this.normalizeText(slot.type) !== 'event') continue;

        const ev = resolveEvent(slot);
        if (!ev) continue;

        const ticket = Number(ev.ticketPrice ?? 0) || 0;
        slot.estimatedCost = Math.round(ticket * normalizedPersons);
        slot.eventId = ev.id;
        slot.ticketPrice = ticket;
        slot.persons = normalizedPersons;
        slot.currencyCode = ev.currencyCode ?? 'ILS';
      }

      day.totalDayCost =
        (Number(day.morning?.estimatedCost ?? 0) || 0) +
        (Number(day.afternoon?.estimatedCost ?? 0) || 0) +
        (Number(day.evening?.estimatedCost ?? 0) || 0);
    }

    generatedPlan.totalEstimatedCost = generatedPlan.days.reduce(
      (sum, d) => sum + (d.totalDayCost ?? 0),
      0,
    );

    return generatedPlan;
  }

  private buildEmptySlot(name = 'No suitable place found'): ITripSlot {
    return {
      name,
      duration: '2–3 hours',
      estimatedCost: 0,
    };
  }

  private dedupePlacesAcrossDays(
    generatedPlan: IGeneratedPlan,
    catalogPlaces: Array<{
      id: string;
      name: string;
      type?: string;
      price: number;
      perPerson?: boolean;
      openingHours?: Array<{
        day: number;
        open: string | null;
        close: string | null;
      }>;
    }>,
    persons: number,
  ): IGeneratedPlan {
    if (
      !Array.isArray(generatedPlan?.days) ||
      generatedPlan.days.length === 0
    ) {
      return generatedPlan;
    }

    const byId = new Map(catalogPlaces.map((p) => [p.id, p]));
    const usedPlaceIds = new Set<string>();
    const availableQueue = catalogPlaces.map((p) => p.id);

    const popNextUnusedPlaceId = () => {
      while (availableQueue.length > 0) {
        const candidate = availableQueue.shift();
        if (!candidate) continue;
        if (usedPlaceIds.has(candidate)) continue;
        usedPlaceIds.add(candidate);
        return candidate;
      }
      return null;
    };

    const estimate = (basePrice?: number, perPerson?: boolean) => {
      const price = Number(basePrice ?? 0) || 0;
      return perPerson
        ? Math.round(price * Math.max(1, persons || 1))
        : Math.round(price);
    };

    for (const day of generatedPlan.days) {
      for (const slotName of ['morning', 'afternoon', 'evening'] as const) {
        const slot = day[slotName] as ITripSlot | undefined;
        if (!slot || slot.type === 'EVENT') continue;

        const currentPlaceId = slot.placeId;
        if (currentPlaceId && !usedPlaceIds.has(currentPlaceId)) {
          usedPlaceIds.add(currentPlaceId);
          continue;
        }

        const nextPlaceId = popNextUnusedPlaceId();
        if (!nextPlaceId) {
          day[slotName] = this.buildEmptySlot();
          continue;
        }

        const nextPlace = byId.get(nextPlaceId);
        if (!nextPlace) {
          day[slotName] = this.buildEmptySlot();
          continue;
        }

        const oh = nextPlace.openingHours?.[0];
        day[slotName] = {
          placeId: nextPlace.id,
          name: nextPlace.name,
          type: nextPlace.type,
          duration: slot.duration || '2–3 hours',
          estimatedCost: estimate(nextPlace.price, nextPlace.perPerson),
          openTime: oh?.open,
          closeTime: oh?.close,
        };
      }

      day.totalDayCost =
        (Number(day.morning?.estimatedCost ?? 0) || 0) +
        (Number(day.afternoon?.estimatedCost ?? 0) || 0) +
        (Number(day.evening?.estimatedCost ?? 0) || 0);
    }

    generatedPlan.totalEstimatedCost = generatedPlan.days.reduce(
      (sum, d) => sum + (d.totalDayCost ?? 0),
      0,
    );

    return generatedPlan;
  }

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
    const tripPlan = await this.tripPlanRepo.findOne({
      where: { id },
      relations: ['city'],
    });

    if (!tripPlan) {
      throw new NotFoundException('Trip plan not found');
    }

    if (tripPlan.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Best-effort: if the stored generatedPlan doesn't include events, try
    // to augment it with overlapping events for the trip's city. We avoid
    // mutating DB state and only modify the returned object.
    try {
      const { start, end } = this.getPlannerWindow(
        tripPlan.createdAt ?? new Date(),
        tripPlan.days || 1,
      );

      const cityPlaceRows = await this.placeRepo.find({
        where: { city: { id: tripPlan.cityId } },
        select: { id: true },
      });
      const cityVenueIds = new Set(cityPlaceRows.map((p) => p.id));

      const cityEvents = await this.findCityEventsInWindow(
        {
          id: tripPlan.cityId,
          name: tripPlan.city?.name,
          stateName: tripPlan.city?.stateName,
        },
        start,
        end,
        cityVenueIds,
      );

      if (
        Array.isArray(tripPlan.generatedPlan?.days) &&
        cityEvents.length > 0
      ) {
        const generatedPlan = JSON.parse(
          JSON.stringify(tripPlan.generatedPlan),
        );
        this.injectEventsIntoPlan(
          generatedPlan,
          cityEvents,
          tripPlan.persons || 1,
          start,
        );
        this.normalizeEventSlotCosts(
          generatedPlan,
          cityEvents,
          tripPlan.persons || 1,
        );

        // Attach the augmented generatedPlan to the returned tripPlan object
        // without persisting it.
        (tripPlan as any).generatedPlan = generatedPlan;
      }
    } catch (err) {
      // best-effort only; swallow any errors
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

    const cityVenueIds = new Set(places.map((p) => p.id));

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

    const { start: plannerStartDate, end: plannerEndDate } =
      this.getPlannerWindow(new Date(), dto.days);

    // Include events that overlap the planner window:
    // event.startDate <= plannerEndDate AND event.endDate >= plannerStartDate.
    const cityEvents = await this.findCityEventsInWindow(
      {
        id: city.id,
        name: city.name,
        stateName: city.stateName,
      },
      plannerStartDate,
      plannerEndDate,
      cityVenueIds,
    );

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

    const normalizedPricingByPlace = await this.normalizePlacePricings(
      updatedPlaces,
      destinationName,
      dto.persons,
    );

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
        .map((p) => {
          const normalizedPricing = normalizedPricingByPlace.get(p.id);

          return {
            id: p.id,
            name: p.name,
            type: p.type,
            rating: p.ratingAverage,
            imageUrl: p.imageUrl ?? null,
            tags: p.tags.map((t) => t.name),
            price: normalizedPricing?.price ?? 0,
            currency: normalizedPricing?.currency ?? 'ILS',
            perPerson: normalizedPricing?.perPerson ?? false,
            openingHours: normalizeOpeningHours(p.openingHours),
          };
        }),
      events: cityEvents.map((e) => ({
        id: e.id,
        name: e.title,
        price: e.ticketPrice,
        currency: e.currencyCode,
        startDate: e.startDate,
        endDate: e.endDate,
        venue: e.venue?.name,
        venueId: e.venue?.id,
        imageUrl: e.venue?.imageUrl ?? null,
      })),
    };

    let generatedPlan: IGeneratedPlan;

    try {
      generatedPlan = await this.geminiService.generateTripPlan(context);
    } catch (err) {
      if (err instanceof GeminiQuotaExceededError) {
        this.logger.warn(
          `AI quota exceeded, returning explicit error instead of fallback: ${err.detail ?? err.message}`,
        );
        throw new HttpException(
          'AI planner temporarily unavailable بسبب تجاوز حد الطلبات. حاول بعد دقيقة.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      this.logger.warn(
        `AI trip generation failed, falling back to rule-based plan: ${String(err)}`,
      );
      generatedPlan = this.buildRuleBasedPlan(context);
    }

    // Ensure overlapping city events are surfaced in the generated plan.
    try {
      if (generatedPlan && Array.isArray(generatedPlan.days)) {
        this.injectEventsIntoPlan(
          generatedPlan,
          cityEvents,
          dto.persons || 1,
          plannerStartDate,
        );
        this.normalizeEventSlotCosts(
          generatedPlan,
          cityEvents,
          dto.persons || 1,
        );

        // Avoid repeating the same place across multiple days in the planner output.
        this.dedupePlacesAcrossDays(
          generatedPlan,
          context.places,
          dto.persons || 1,
        );
      }
    } catch (err) {
      // Swallow errors here; this augmentation is best-effort only.
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
   * Persist a generated plan object for an authenticated user.
   * Used when guests generate a plan and later sign in to save the exact plan.
   */
  async createFromGenerated(
    userId: string,
    dto: {
      cityId: string;
      days: number;
      budget: number;
      persons: number;
      generatedPlan: IGeneratedPlan;
      title?: string | null;
      description?: string | null;
    },
  ) {
    const city = await this.cityRepo.findOne({ where: { id: dto.cityId } });
    if (!city) {
      throw new NotFoundException('Destination not found');
    }

    const tripPlan = this.tripPlanRepo.create({
      userId,
      cityId: dto.cityId,
      days: dto.days,
      budget: dto.budget,
      persons: dto.persons,
      generatedPlan: dto.generatedPlan,
      title: dto.title ?? null,
      description: dto.description ?? null,
    });

    await this.tripPlanRepo.save(tripPlan);

    // Return the saved TripPlan entity (serialized)
    return tripPlan;
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
      `Destination: ${destinationName}.`,
      'Start early for landmarks and keep cafe/restaurant stops for later in the day.',
      'Double-check opening hours and ticket prices before heading out.',
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

  private validateAndFixPlan(
    plan: IGeneratedPlan,
    context: any,
  ): IGeneratedPlan {
    const placeMap = new Map<string, any>(
      (context.places ?? []).map((p: any) => [String(p.id), p]),
    );

    for (const day of plan.days) {
      for (const slotName of ['morning', 'afternoon', 'evening'] as const) {
        const slot = day[slotName];

        if (!slot?.placeId) continue;

        const place: any = placeMap.get(slot.placeId);

        if (!place) {
          day[slotName] = this.buildEmptySlot();
          continue;
        }

        const basePrice = Number(place.price) || 0;

        slot.name = place.name;
        slot.type = place.type;

        slot.estimatedCost = place.perPerson
          ? basePrice * context.persons
          : basePrice;

        const oh = place.openingHours?.[0];
        if (oh) {
          slot.openTime = oh.open;
          slot.closeTime = oh.close;
        }
      }

      day.totalDayCost =
        (day.morning?.estimatedCost || 0) +
        (day.afternoon?.estimatedCost || 0) +
        (day.evening?.estimatedCost || 0);
    }

    plan.totalEstimatedCost = plan.days.reduce(
      (sum, d) => sum + (d.totalDayCost || 0),
      0,
    );

    return plan;
  }
}
