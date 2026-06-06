/**
 * TripPlannerService
 * Core trip generation, saving, and retrieval functionality
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import {
  TripPlan,
  IGeneratedPlan,
  ITripDay,
  ITripSlot,
  IBudgetBreakdown,
} from './entities/trip-planner.entity';
import { CreateTripPlannerDto } from './dto/create-trip-planner.dto';
import { GeminiQuotaExceededError, GeminiService } from './gemini.service';
import { PerDayWeather, TripDayContext } from './ai.service';
import { GeoRoutingService } from './geo-routing.service';
import { TripCacheService } from './trip-cache.service';
import { ImageFetcherService } from './image-fetcher.service';
import { MediaEnrichmentService } from './media-enrichment.service';
import { CalendarService } from '../modules/calendar/calendar.service';
import { CreditEngineService } from '../modules/credits/credit-engine.service';
import { UsageService } from '../modules/usage/usage.service';
import { UsageSource } from '../modules/usage/entities/usage-log.entity';
import { Place } from 'src/modules/place/entities/place.entity';
import { Event } from 'src/modules/event/entities/event.entity';
import { City } from 'src/modules/cities/entities/city.entity';
import { rateLimiter, RATE_LIMIT_PRESETS } from '../common/utils/rateLimiter';
import { HotPathCache } from 'src/common/utils/hot-path-cache';

const AI_TRIP_GENERATION_CREDIT_COST = 5;

type NormalizedPlacePricing = {
  price: number;
  currency: string;
  perPerson: boolean;
  estimated: boolean;
};

type LiveTravelSignal = string;

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
  shareVisibility?: string;
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
  private readonly readCache = new HotPathCache(200);

  constructor(
    @InjectRepository(TripPlan) private tripPlanRepo: Repository<TripPlan>,
    @InjectRepository(City) private cityRepo: Repository<City>,
    @InjectRepository(Place) private placeRepo: Repository<Place>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    private geminiService: GeminiService,
    private geoRoutingService: GeoRoutingService,
    private tripCacheService: TripCacheService,
    private imageFetcher: ImageFetcherService,
    private mediaEnrichment: MediaEnrichmentService,
    private calendarService: CalendarService,
    private creditEngine: CreditEngineService,
    private usage: UsageService,
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

  private isReligiousPlace(place: { tags: Array<{ name: string }> }): boolean {
    return place.tags.some((t) => t.name.toLowerCase() === 'religious');
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

    // Pre-assign religious places: always FREE (price = 0)
    for (const place of places) {
      if (this.isReligiousPlace(place)) {
        pricingByPlace.set(place.id, {
          price: 0,
          currency: 'ILS',
          perPerson: false,
          estimated: false,
        });
      }
    }

    const toEstimate = places.filter((p) => {
      // Skip if already set as religious-free
      if (pricingByPlace.has(p.id)) return false;

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
    const useAiTripGeneration =
      String(process.env.TRIP_PLANNER_USE_AI ?? 'false') === 'true';
    const useAiPriceEstimates =
      String(process.env.TRIP_PLANNER_AI_PRICE_ESTIMATE ?? 'false') ===
        'true' &&
      (!useAiTripGeneration ||
        String(
          process.env.TRIP_PLANNER_AI_PRICE_ESTIMATE_WITH_AI_PLAN ?? 'false',
        ) === 'true');
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
      // Safety check: religious places must always be free
      if (this.isReligiousPlace(place)) {
        pricingByPlace.set(place.id, {
          price: 0,
          currency: 'ILS',
          perPerson: false,
          estimated: false,
        });
        continue;
      }

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

  private resolvePlannerStartDate(input?: string | Date | null): Date {
    if (input instanceof Date && !Number.isNaN(input.getTime())) {
      return new Date(input);
    }

    if (typeof input === 'string' && input.trim()) {
      const parsed = new Date(input);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return new Date();
  }

  private annotatePlanDates(
    generatedPlan: IGeneratedPlan,
    plannerStartDate: Date,
  ): IGeneratedPlan {
    if (!Array.isArray(generatedPlan?.days)) {
      return generatedPlan;
    }

    const start = new Date(plannerStartDate);
    start.setHours(0, 0, 0, 0);
    generatedPlan.startDate = start.toISOString();

    generatedPlan.days = generatedPlan.days.map((day, index) => {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + index);

      return {
        ...day,
        date: currentDate.toISOString(),
      };
    });

    return generatedPlan;
  }

  private normalizeText(value?: string | null): string {
    return (value ?? '').trim().toLowerCase();
  }

  private normalizeSearchText(value?: string | null): string {
    return (value ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  private levenshteinDistance(left: string, right: string): number {
    if (left === right) return 0;
    if (!left.length) return right.length;
    if (!right.length) return left.length;

    const previous = Array.from(
      { length: right.length + 1 },
      (_, index) => index,
    );

    for (let i = 1; i <= left.length; i++) {
      let diagonal = previous[0];
      previous[0] = i;

      for (let j = 1; j <= right.length; j++) {
        const temp = previous[j];
        const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;
        previous[j] = Math.min(
          previous[j] + 1,
          previous[j - 1] + 1,
          diagonal + substitutionCost,
        );
        diagonal = temp;
      }
    }

    return previous[right.length];
  }

  private scoreCityMatch(
    searchText: string,
    city: City,
    countryName?: string,
  ): number {
    const normalizedSearch = this.normalizeSearchText(searchText);
    const normalizedCity = this.normalizeSearchText(city.name);
    const normalizedState = this.normalizeSearchText(city.stateName);
    const normalizedCountry = this.normalizeSearchText(city.country?.name);
    const normalizedInputCountry = this.normalizeSearchText(countryName);

    if (!normalizedSearch || !normalizedCity) {
      return 0;
    }

    let score = 0;

    if (normalizedSearch === normalizedCity) score += 100;
    if (normalizedState && normalizedSearch === normalizedState) score += 96;
    if (
      normalizedSearch.includes(normalizedCity) ||
      normalizedCity.includes(normalizedSearch)
    ) {
      score += 90;
    }

    if (normalizedState) {
      if (
        normalizedSearch.includes(normalizedState) ||
        normalizedState.includes(normalizedSearch)
      ) {
        score += 88;
      }
    }

    const searchTokens = new Set(normalizedSearch.split(' ').filter(Boolean));
    const cityTokens = new Set(
      `${normalizedCity} ${normalizedState}`.split(' ').filter(Boolean),
    );
    const overlap = [...searchTokens].filter((token) =>
      cityTokens.has(token),
    ).length;
    if (overlap > 0) {
      score += Math.min(30, overlap * 12);
    }

    const distance = this.levenshteinDistance(normalizedSearch, normalizedCity);
    const maxLength = Math.max(
      normalizedSearch.length,
      normalizedCity.length,
      1,
    );
    const similarity = 1 - distance / maxLength;
    score += Math.round(Math.max(0, similarity) * 40);

    if (normalizedInputCountry) {
      if (normalizedCountry === normalizedInputCountry) {
        score += 18;
      } else if (
        normalizedCountry.includes(normalizedInputCountry) ||
        normalizedInputCountry.includes(normalizedCountry)
      ) {
        score += 10;
      }
    }

    return score;
  }

  private cacheTtlMs(name: string, fallback: number): number {
    const raw = Number(process.env[name]);
    return Number.isFinite(raw) && raw > 0 ? raw : fallback;
  }

  private externalSignalTimeoutMs(): number {
    return this.cacheTtlMs('TRIP_EXTERNAL_SIGNAL_TIMEOUT_MS', 1_800);
  }

  private async collectLiveTravelSignals(
    city: City,
  ): Promise<LiveTravelSignal[]> {
    const tasks = [
      this.fetchWeatherSignal(city),
      this.fetchExchangeRateSignal(city),
      this.fetchFoursquareSignal(city),
    ];

    const settled = await Promise.allSettled(tasks);
    return settled
      .map((result) => (result.status === 'fulfilled' ? result.value : null))
      .filter((value): value is string => Boolean(value));
  }

  private async fetchWeatherSignal(city: City): Promise<string | null> {
    const forecast = await this.fetchWeatherForecast(city, new Date(), 1).catch(() => null);
    if (!forecast?.length) return null;
    const today = forecast[0];
    return `Live weather in ${city.name}: ${today.tempC}°C, ${today.condition}. Plan outdoor/indoor activities accordingly.`;
  }

  private async fetchWeatherForecast(
    city: City,
    startDate: Date,
    days: number,
  ): Promise<PerDayWeather[]> {
    const apiKey = process.env.OPENWEATHER_API_KEY?.trim();
    const lat = Number(city.latitude);
    const lon = Number(city.longitude);
    if (!apiKey || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return [];
    }

    try {
      const response = await axios.get(
        'https://api.openweathermap.org/data/2.5/forecast',
        {
          params: { lat, lon, appid: apiKey, units: 'metric', cnt: Math.min(days * 8 + 8, 40) },
          timeout: this.externalSignalTimeoutMs(),
        },
      );
      const data = response.data as any;
      const list: any[] = Array.isArray(data?.list) ? data.list : [];

      // Group 3-hour slots by date and aggregate into daily summaries
      const byDate = new Map<string, { temps: number[]; conditions: string[]; rainCount: number }>();
      for (const item of list) {
        const dt = new Date(item.dt * 1000);
        const dateKey = this.formatLocalDate(dt);
        if (!byDate.has(dateKey)) {
          byDate.set(dateKey, { temps: [], conditions: [], rainCount: 0 });
        }
        const entry = byDate.get(dateKey)!;
        const temp = Number(item.main?.temp);
        if (Number.isFinite(temp)) entry.temps.push(temp);
        const condition = String(item.weather?.[0]?.description ?? '').trim();
        if (condition) entry.conditions.push(condition);
        const weatherId = Number(item.weather?.[0]?.id ?? 0);
        if (weatherId >= 200 && weatherId < 700) entry.rainCount++;
      }

      const result: PerDayWeather[] = [];
      const tripStart = new Date(startDate);
      tripStart.setHours(0, 0, 0, 0);

      for (let d = 0; d < Math.min(days, 5); d++) {
        const dateObj = new Date(tripStart);
        dateObj.setDate(tripStart.getDate() + d);
        const dateKey = this.formatLocalDate(dateObj);
        const entry = byDate.get(dateKey);

        if (entry && entry.temps.length > 0) {
          const avgTemp = Math.round(entry.temps.reduce((s, t) => s + t, 0) / entry.temps.length);
          const dominantCondition = entry.conditions[Math.floor(entry.conditions.length / 2)] ?? 'partly cloudy';
          const isRainy = entry.rainCount >= 2;
          result.push({
            date: dateKey,
            condition: dominantCondition,
            tempC: avgTemp,
            isRainy,
            isHot: avgTemp > 30,
            isCold: avgTemp < 10,
          });
        }
      }

      return result;
    } catch (error) {
      this.logger.warn(`Weather forecast unavailable: ${(error as Error).message}`);
      return [];
    }
  }

  private formatLocalDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async fetchExchangeRateSignal(city: City): Promise<string | null> {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY?.trim();
    const targetCurrency = city.country?.currencies?.[0]?.code?.toUpperCase();
    if (!apiKey || !targetCurrency || targetCurrency === 'ILS') {
      return null;
    }

    try {
      const response = await axios.get(
        `https://v6.exchangerate-api.com/v6/${apiKey}/pair/ILS/${targetCurrency}`,
        { timeout: this.externalSignalTimeoutMs() },
      );
      const rate = Number((response.data as any)?.conversion_rate);
      if (!Number.isFinite(rate) || rate <= 0) {
        return null;
      }

      return `Currency signal: 1 ILS is about ${rate.toFixed(2)} ${targetCurrency}; keep final payments tied to live merchant prices.`;
    } catch (error) {
      this.logger.warn(
        `Exchange-rate signal unavailable: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private async fetchFoursquareSignal(city: City): Promise<string | null> {
    const apiKey = process.env.FOURSQUARE_API_KEY?.trim();
    const lat = Number(city.latitude);
    const lon = Number(city.longitude);
    if (!apiKey || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }

    try {
      const response = await axios.get(
        'https://api.foursquare.com/v3/places/search',
        {
          headers: { Authorization: apiKey },
          params: {
            ll: `${lat},${lon}`,
            query: 'things to do',
            sort: 'RATING',
            limit: 5,
            fields: 'name,categories,rating',
          },
          timeout: this.externalSignalTimeoutMs(),
        },
      );
      const results = Array.isArray((response.data as any)?.results)
        ? (response.data as any).results
        : [];
      const categories = [
        ...new Set(
          results
            .flatMap((place: any) =>
              Array.isArray(place?.categories) ? place.categories : [],
            )
            .map((category: any) => String(category?.name ?? '').trim())
            .filter(Boolean),
        ),
      ].slice(0, 4);

      if (categories.length === 0) {
        return null;
      }

      return `Foursquare live signal near ${city.name}: popular nearby categories include ${categories.join(', ')}. Use this as context only; itinerary slots stay limited to Waynest places.`;
    } catch (error) {
      this.logger.warn(
        `Foursquare signal unavailable: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /** Determine if a place type is primarily outdoors */
  private isOutdoorPlaceType(type?: string, tags?: string[]): boolean {
    const outdoorTypes = new Set(['park', 'beach', 'landmark', 'nature', 'trail', 'viewpoint', 'garden', 'tour']);
    const normalized = this.normalizeText(type);
    if (outdoorTypes.has(normalized)) return true;
    const tagSet = new Set((tags ?? []).map((t) => this.normalizeText(t)));
    return tagSet.has('outdoor') || tagSet.has('nature') || tagSet.has('beach') || tagSet.has('park');
  }

  /**
   * Destination Scoring Engine.
   * Scores each place on a 0–100 scale based on:
   * - Rating quality     : 35 pts
   * - Interest match     : 30 pts
   * - Weather compat     : 20 pts
   * - Budget fit         : 15 pts
   */
  private scorePlaces<T extends {
    id: string;
    type?: string;
    rating?: number | string | null;
    tags?: string[];
    price: number;
    perPerson?: boolean;
  }>(
    places: T[],
    interests: string[],
    weatherForecast: PerDayWeather[],
    budgetPerPersonPerDay: number,
    travelerType?: string,
  ): (T & { score: number })[] {
    const dominantWeather = weatherForecast[0] ?? null;
    const interestSet = new Set(interests.map((i) => i.toLowerCase()));

    // Profile-type affinity boosts (which place types suit which traveler)
    const profileTypeBoost: Record<string, string[]> = {
      adventure: ['park', 'trail', 'beach', 'nature', 'activity', 'tour'],
      luxury: ['restaurant', 'hotel', 'landmark', 'gallery', 'museum'],
      backpacker: ['landmark', 'park', 'cafe', 'market'],
      family: ['park', 'museum', 'attraction', 'beach', 'restaurant'],
      solo: ['cafe', 'museum', 'gallery', 'landmark', 'market'],
      couple: ['restaurant', 'park', 'landmark', 'beach', 'cafe', 'gallery'],
      student: ['museum', 'landmark', 'cafe', 'gallery', 'park'],
      business: ['restaurant', 'landmark', 'hotel', 'cafe'],
    };
    const preferredTypes = new Set(
      profileTypeBoost[travelerType ?? 'solo'] ?? profileTypeBoost['solo'],
    );

    return places.map((place) => {
      const rating = Math.max(0, Math.min(5, Number(place.rating ?? 0) || 0));
      const ratingScore = (rating / 5) * 35;

      // Interest match score
      const placeTags = (place.tags ?? []).map((t) => t.toLowerCase());
      const placeType = this.normalizeText(place.type);
      const matchedInterests = placeTags.filter((tag) => interestSet.has(tag)).length
        + (interestSet.has(placeType) ? 1 : 0);
      const maxPossibleInterestMatch = Math.max(1, interestSet.size);
      const interestScore = Math.min(30, (matchedInterests / maxPossibleInterestMatch) * 30);

      // Weather compatibility score
      let weatherScore = 10; // neutral default
      if (dominantWeather) {
        const isOutdoor = this.isOutdoorPlaceType(place.type, place.tags);
        if (dominantWeather.isRainy) {
          weatherScore = isOutdoor ? 0 : 20;
        } else if (dominantWeather.isHot) {
          weatherScore = isOutdoor ? 8 : 15;
        } else {
          weatherScore = isOutdoor ? 20 : 12;
        }
      }

      // Budget fit score
      const estimatedCost = place.perPerson ? place.price : place.price;
      const budgetFitScore =
        estimatedCost <= 0
          ? 15
          : estimatedCost <= budgetPerPersonPerDay
            ? 15
            : estimatedCost <= budgetPerPersonPerDay * 2
              ? 8
              : 2;

      // Traveler profile type affinity bonus (built into the final score)
      const typeAffinityBonus = preferredTypes.has(placeType) ? 5 : 0;

      const rawScore = ratingScore + interestScore + weatherScore + budgetFitScore + typeAffinityBonus;
      const score = Math.round(Math.min(100, Math.max(0, rawScore)));

      return { ...place, score };
    });
  }

  private readonly DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  /**
   * Build per-day trip context including day-of-week and closed place lists.
   * This lets the AI know which places are closed on each specific calendar day.
   */
  private buildTripDayContexts(
    startDate: Date,
    days: number,
    places: Array<{ id: string; openingHours: Array<{ day: number; open: string | null; close: string | null }> }>,
    weatherForecast: PerDayWeather[],
  ): TripDayContext[] {
    const contexts: TripDayContext[] = [];

    for (let d = 0; d < days; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + d);
      const dow = date.getDay(); // 0=Sunday … 6=Saturday
      const dateStr = date.toISOString().split('T')[0];

      // Find places that have opening hours data but are NOT open on this day of week
      const closedPlaceIds = places
        .filter((p) => {
          if (!p.openingHours.length) return false; // no data = assume always open
          return !p.openingHours.some((h) => h.day === dow);
        })
        .map((p) => p.id);

      contexts.push({
        dayNumber: d + 1,
        date: dateStr,
        dayOfWeek: dow,
        dayName: this.DOW_NAMES[dow],
        weather: weatherForecast[d],
        closedPlaceIds: closedPlaceIds.length > 0 ? closedPlaceIds : undefined,
      });
    }

    return contexts;
  }

  /**
   * Calculate a Trip Quality Score (0–100) based on:
   * - Budget utilization (25 pts): plan uses 60–95% of budget
   * - Variety (25 pts): different place types across days
   * - Profile match (25 pts): how well places match traveler profile
   * - Data completeness (25 pts): real pricing vs estimated
   */
  private calculateTripQualityScore(
    generatedPlan: IGeneratedPlan,
    budget: number,
    travelerType?: string,
    pricingMap?: Map<string, { estimated: boolean }>,
  ): number {
    if (!generatedPlan?.days?.length) return 0;

    // 1. Budget utilization (25 pts)
    const utilization = generatedPlan.totalEstimatedCost / Math.max(1, budget);
    let budgetScore = 0;
    if (utilization >= 0.5 && utilization <= 1.0) {
      budgetScore = utilization >= 0.7 ? 25 : 15;
    } else if (utilization > 1.0) {
      budgetScore = 5; // over budget
    } else {
      budgetScore = 10; // very under budget
    }

    // 2. Variety score (25 pts): unique place types across all slots
    const allTypes = new Set<string>();
    const slotNames = ['morning', 'afternoon', 'evening'] as const;
    for (const day of generatedPlan.days) {
      for (const slot of slotNames) {
        const s = day[slot];
        if (s?.type) allTypes.add(s.type.toLowerCase());
        if (s?.name) allTypes.add('filled'); // at least something is there
      }
    }
    const totalSlots = generatedPlan.days.length * 3;
    const filledSlots = generatedPlan.days.reduce((count, day) =>
      count + slotNames.filter((s) => day[s]?.name).length, 0);
    const fillRate = filledSlots / Math.max(1, totalSlots);
    const varietyScore = Math.round(Math.min(25, (allTypes.size / 6) * 15 + fillRate * 10));

    // 3. Profile match (25 pts): based on place types vs profile preference
    const profileTypeBoost: Record<string, string[]> = {
      adventure: ['park', 'trail', 'beach', 'nature', 'activity', 'tour'],
      luxury: ['restaurant', 'hotel', 'landmark', 'gallery', 'museum'],
      backpacker: ['landmark', 'park', 'cafe', 'market'],
      family: ['park', 'museum', 'attraction', 'beach', 'restaurant'],
      solo: ['cafe', 'museum', 'gallery', 'landmark', 'market'],
      couple: ['restaurant', 'park', 'landmark', 'beach', 'cafe', 'gallery'],
      student: ['museum', 'landmark', 'cafe', 'gallery', 'park'],
      business: ['restaurant', 'landmark', 'hotel', 'cafe'],
    };
    const preferred = new Set(profileTypeBoost[travelerType ?? 'solo'] ?? []);
    let profileMatches = 0;
    for (const day of generatedPlan.days) {
      for (const slot of slotNames) {
        const t = day[slot]?.type?.toLowerCase();
        if (t && preferred.has(t)) profileMatches++;
      }
    }
    const profileScore = Math.round(Math.min(25, (profileMatches / Math.max(1, filledSlots)) * 25));

    // 4. Data completeness (25 pts): real pricing is better than estimated
    let realPricingCount = 0;
    let totalPricingCount = 0;
    for (const day of generatedPlan.days) {
      for (const slot of slotNames) {
        const s = day[slot];
        if (!s?.placeId) continue;
        totalPricingCount++;
        const meta = pricingMap?.get(s.placeId);
        if (meta && !meta.estimated) realPricingCount++;
      }
    }
    const completenessScore = totalPricingCount === 0 ? 15
      : Math.round((realPricingCount / totalPricingCount) * 25);

    return Math.min(100, budgetScore + varietyScore + profileScore + completenessScore);
  }

  /**
   * Estimate travel time (minutes) between consecutive place slots in a day.
   * Returns total estimated travel minutes for the day.
   */
  private estimateDayTravelMinutes(
    slots: Array<{ lat?: number; lng?: number } | null>,
  ): number {
    let totalMinutes = 0;
    const validSlots = slots.filter((s): s is { lat: number; lng: number } =>
      s !== null && typeof s?.lat === 'number' && typeof s?.lng === 'number',
    );

    for (let i = 0; i < validSlots.length - 1; i++) {
      const a = validSlots[i];
      const b = validSlots[i + 1];
      const distKm = this.haversineKm(a.lat, a.lng, b.lat, b.lng);
      // Assume 25 km/h average city travel speed (walking + transit mix)
      const minutes = Math.round((distKm / 25) * 60);
      totalMinutes += Math.max(5, Math.min(120, minutes));
    }

    return totalMinutes;
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Build a budget breakdown for the generated plan,
   * allocating the total budget across spending categories.
   */
  private buildBudgetBreakdown(
    generatedPlan: IGeneratedPlan,
    totalBudget: number,
    persons: number,
    travelerType?: string,
  ): IBudgetBreakdown {
    const profileAllocations: Record<string, { food: number; attractions: number; transport: number; shopping: number; emergency: number }> = {
      adventure: { food: 20, attractions: 40, transport: 20, shopping: 5, emergency: 15 },
      luxury: { food: 45, attractions: 30, transport: 10, shopping: 5, emergency: 10 },
      backpacker: { food: 25, attractions: 20, transport: 30, shopping: 10, emergency: 15 },
      family: { food: 35, attractions: 35, transport: 15, shopping: 5, emergency: 10 },
      solo: { food: 30, attractions: 35, transport: 15, shopping: 10, emergency: 10 },
      couple: { food: 40, attractions: 30, transport: 10, shopping: 10, emergency: 10 },
      student: { food: 30, attractions: 30, transport: 20, shopping: 5, emergency: 15 },
      business: { food: 50, attractions: 20, transport: 15, shopping: 5, emergency: 10 },
    };

    const alloc = profileAllocations[travelerType ?? 'solo'] ?? profileAllocations['solo'];
    const food = Math.round(totalBudget * alloc.food / 100);
    const attractions = Math.round(totalBudget * alloc.attractions / 100);
    const transport = Math.round(totalBudget * alloc.transport / 100);
    const shopping = Math.round(totalBudget * alloc.shopping / 100);
    const emergency = Math.round(totalBudget * alloc.emergency / 100);

    return {
      food,
      attractions,
      transport,
      shopping,
      emergency,
      total: food + attractions + transport + shopping + emergency,
    };
  }

  private appendLiveTravelTips(
    generatedPlan: IGeneratedPlan,
    signals: LiveTravelSignal[],
  ): void {
    if (!signals.length) {
      return;
    }

    const existingTips = Array.isArray(generatedPlan.tips)
      ? generatedPlan.tips
      : [];
    generatedPlan.tips = [...existingTips, ...signals].slice(0, 8);
  }

  private publicBrowseCacheTtlMs() {
    return this.cacheTtlMs('TRIP_PUBLIC_BROWSE_CACHE_MS', 60_000);
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
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
  }

  private readonly SLOT_RANGES: Record<string, { start: number; end: number }> =
    {
      morning: { start: 6, end: 12 },
      afternoon: { start: 12, end: 17 },
      evening: { start: 17, end: 24 },
    };

  private getHourOfDay(d?: Date | string | null): number | null {
    if (!d) return null;
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return null;
    return dt.getHours();
  }

  private getPreferredSlotsForEvent(
    ev: Event,
  ): ('morning' | 'afternoon' | 'evening')[] {
    const hour = this.getHourOfDay(ev.startDate);
    if (hour === null) {
      return ['morning', 'afternoon', 'evening'];
    }

    // Find which slot(s) the event's time range overlaps
    const endHour = this.getHourOfDay(ev.endDate) ?? hour + 2;
    const matching: ('morning' | 'afternoon' | 'evening')[] = [];
    for (const [slot, range] of Object.entries(this.SLOT_RANGES)) {
      if (hour < range.end && endHour > range.start) {
        matching.push(slot as 'morning' | 'afternoon' | 'evening');
      }
    }

    if (matching.length > 0) return matching;
    return ['morning', 'afternoon', 'evening'];
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
          name: ev.title ?? ev.slug ?? ev.id,
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

      // Prefer slots that match the event's time of day
      const preferred = this.getPreferredSlotsForEvent(ev);
      const allSlots: ('morning' | 'afternoon' | 'evening')[] = [
        'morning',
        'afternoon',
        'evening',
      ];
      const others = allSlots.filter((s) => !preferred.includes(s));
      const priority = [...preferred, ...others];

      let placed = false;
      for (const slot of priority) {
        if (putEvent(slot)) {
          placed = true;
          break;
        }
      }
      if (!placed) {
        putEvent(preferred[0] ?? 'afternoon', true);
      }
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

  /**
   * Slot-type classification: what time of day is each place type appropriate for?
   * Returns the PREFERRED slots in priority order.
   */
  private getPreferredSlotsForPlaceType(
    type?: string,
    tags?: string[],
    name?: string,
  ): ('morning' | 'afternoon' | 'evening')[] {
    const text = [type, name, ...(tags ?? [])].join(' ').toLowerCase();

    // Evening-ONLY types (never place in morning)
    if (['restaurant', 'cafe', 'coffee', 'bar', 'lounge', 'bakery', 'dining', 'diner'].some((k) => text.includes(k))) {
      return ['evening', 'afternoon'];
    }

    // Morning-preferred types (cultural, historical, religious)
    if (['museum', 'gallery', 'heritage', 'historical', 'church', 'mosque', 'temple',
         'synagogue', 'religious', 'shrine', 'monument', 'old city', 'old town',
         'landmark', 'nativity', 'manger', 'basilica', 'cathedral'].some((k) => text.includes(k))) {
      return ['morning', 'afternoon'];
    }

    // Afternoon-preferred types (active, outdoors)
    if (['park', 'beach', 'market', 'bazaar', 'shop', 'mall', 'nature',
         'garden', 'trail', 'viewpoint', 'observation', 'activity', 'tour',
         'attraction', 'adventure', 'zoo', 'aquarium'].some((k) => text.includes(k))) {
      return ['afternoon', 'morning'];
    }

    // Default: any slot
    return ['morning', 'afternoon', 'evening'];
  }

  /**
   * Enforce slot-type rules on the generated plan.
   *
   * Priority order:
   * 1. Move misplaced place to empty preferred slot
   * 2. Swap if both places mutually benefit
   * 3. Force-replace: if evening has a LANDMARK and no beneficial swap possible,
   *    push it to morning/afternoon (displacing the existing place to evening),
   *    because a LANDMARK anywhere is better than a LANDMARK in evening
   * 4. Last resort: if the place is in evening and CANNOT move → null the evening slot
   *    (empty is better than wrong)
   */
  private enforceSlotTypeRules(generatedPlan: IGeneratedPlan): IGeneratedPlan {
    if (!generatedPlan?.days?.length) return generatedPlan;

    const slotOrder: ('morning' | 'afternoon' | 'evening')[] = ['morning', 'afternoon', 'evening'];

    for (const day of generatedPlan.days) {
      const slotMap: Record<string, ITripSlot | null> = {
        morning: day.morning ?? null,
        afternoon: day.afternoon ?? null,
        evening: day.evening ?? null,
      };

      let changed = true;
      let passes = 0;

      while (changed && passes < 4) {
        changed = false;
        passes++;

        for (const currentSlot of slotOrder) {
          const place = slotMap[currentSlot];
          if (!place || place.type === 'EVENT') continue;

          const preferred = this.getPreferredSlotsForPlaceType(
            place.type,
            Array.isArray((place as any).tags) ? (place as any).tags : [],
            place.name,
          );

          if (preferred.includes(currentSlot)) continue;

          let moved = false;

          // Pass 1: move to empty preferred slot
          for (const targetSlot of preferred) {
            if (targetSlot === currentSlot) continue;
            if (!slotMap[targetSlot]) {
              slotMap[targetSlot] = place;
              slotMap[currentSlot] = null;
              changed = true;
              moved = true;
              break;
            }
          }
          if (moved) continue;

          // Pass 2: mutual-benefit swap
          for (const targetSlot of preferred) {
            if (targetSlot === currentSlot) continue;
            const targetPlace = slotMap[targetSlot];
            if (!targetPlace || targetPlace.type === 'EVENT') continue;
            const targetPreferred = this.getPreferredSlotsForPlaceType(
              targetPlace.type,
              Array.isArray((targetPlace as any).tags) ? (targetPlace as any).tags : [],
              targetPlace.name,
            );
            if (targetPreferred.includes(currentSlot)) {
              slotMap[targetSlot] = place;
              slotMap[currentSlot] = targetPlace;
              changed = true;
              moved = true;
              break;
            }
          }
          if (moved) continue;

          // Pass 3: force-push to preferred slot (displace current occupant to this slot)
          // Only for EVENING misplacement — always wrong to have cultural sites at night
          if (currentSlot === 'evening') {
            const targetSlot = preferred[0]; // best preferred slot
            if (targetSlot && targetSlot !== currentSlot) {
              const displaced = slotMap[targetSlot];
              // Move misplaced landmark to preferred slot
              slotMap[targetSlot] = place;
              // Put displaced place in evening (it may not be ideal but better than nothing)
              slotMap[currentSlot] = displaced;
              changed = true;
              moved = true;
            }
          }

          // Pass 4: if evening LANDMARK still can't be moved → null it
          // (an empty slot is cleaner than a LANDMARK at 9pm)
          if (!moved && currentSlot === 'evening') {
            const isCulturalType = ['landmark', 'museum', 'religious', 'heritage', 'park'].some(
              (t) => this.normalizeText(place.type).includes(t),
            );
            if (isCulturalType) {
              slotMap[currentSlot] = null;
              changed = true;
            }
          }
        }
      }

      day.morning   = slotMap['morning']   as ITripSlot | null;
      day.afternoon = slotMap['afternoon'] as ITripSlot | null;
      day.evening   = slotMap['evening']   as ITripSlot | null;

      day.totalDayCost =
        (Number(day.morning?.estimatedCost ?? 0) || 0) +
        (Number(day.afternoon?.estimatedCost ?? 0) || 0) +
        (Number(day.evening?.estimatedCost ?? 0) || 0);
    }

    generatedPlan.totalEstimatedCost = generatedPlan.days.reduce(
      (sum, d) => sum + (d.totalDayCost ?? 0), 0,
    );

    return generatedPlan;
  }

  /**
   * Remove tips that CONTRADICT the actual schedule.
   *
   * Problem: AI places "Manger Square" in the EVENING slot, then writes a tip:
   * "Visit Manger Square in the morning to avoid crowds."
   *
   * Solution: scan each tip for (place_name + time_reference). If the referenced
   * place is actually in a DIFFERENT slot, drop the contradicting tip.
   */
  private validateTipConsistency(generatedPlan: IGeneratedPlan): IGeneratedPlan {
    if (!generatedPlan?.tips?.length || !generatedPlan?.days?.length) {
      return generatedPlan;
    }

    // Build map: normalizedPlaceName → actual slot
    const placeSlotMap = new Map<string, 'morning' | 'afternoon' | 'evening'>();
    for (const day of generatedPlan.days) {
      for (const slotName of ['morning', 'afternoon', 'evening'] as const) {
        const slot = day[slotName];
        if (slot?.name) {
          placeSlotMap.set(this.normalizeText(slot.name), slotName);
          // Also register significant words from the name
          const words = slot.name.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
          for (const word of words) {
            if (!placeSlotMap.has(word)) {
              placeSlotMap.set(word, slotName);
            }
          }
        }
      }
    }

    const slotKeywords: Record<'morning' | 'afternoon' | 'evening', string[]> = {
      morning:   ['morning', 'early morning', 'early', 'sunrise', 'dawn', 'a.m.', 'breakfast'],
      afternoon: ['afternoon', 'midday', 'noon', 'lunchtime', 'lunch'],
      evening:   ['evening', 'night', 'nighttime', 'dinner', 'sunset', 'dusk', 'late', 'p.m.'],
    };

    generatedPlan.tips = generatedPlan.tips.filter((tip) => {
      const tipLower = tip.toLowerCase();

      // Check if this tip says "visit PLACE in the SLOT"
      for (const [placeName, actualSlot] of placeSlotMap) {
        if (!tipLower.includes(placeName)) continue;

        for (const [mentionedSlot, keywords] of Object.entries(slotKeywords) as [
          'morning' | 'afternoon' | 'evening',
          string[],
        ][]) {
          if (mentionedSlot === actualSlot) continue; // consistent — keep it

          if (keywords.some((kw) => tipLower.includes(kw))) {
            // Tip says "visit [place] in [mentionedSlot]" but place is in [actualSlot] → REMOVE
            this.logger.debug(
              `Removed contradicting tip: "${tip}" (place "${placeName}" is in ${actualSlot}, tip says ${mentionedSlot})`,
            );
            return false;
          }
        }
      }

      return true; // keep the tip
    });

    return generatedPlan;
  }

  private getAiGenerationTimeoutMs(): number {
    return this.cacheTtlMs('TRIP_PLANNER_AI_TIMEOUT_MS', 12_000);
  }

  private async generateTripPlanWithTimeout(
    context: Parameters<GeminiService['generateTripPlan']>[0],
  ): Promise<IGeneratedPlan> {
    const timeoutMs = this.getAiGenerationTimeoutMs();
    return Promise.race([
      this.geminiService.generateTripPlan(context),
      new Promise<IGeneratedPlan>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`AI trip generation timed out after ${timeoutMs}ms`),
            ),
          timeoutMs,
        ),
      ),
    ]);
  }

  private getDurationForPlaceType(
    type?: string,
    tags: string[] = [],
    name?: string,
  ): string {
    const t = [type, name, ...tags].join(' ').toLowerCase().trim();

    if (
      ['religious', 'mosque', 'church', 'synagogue', 'temple', 'shrine'].some(
        (k) => t.includes(k),
      )
    ) {
      return '20-40 minutes';
    }
    if (
      ['restaurant', 'cafe', 'bakery', 'coffee', 'diner'].some((k) =>
        t.includes(k),
      )
    ) {
      return t.includes('restaurant') || t.includes('diner')
        ? '60-90 minutes'
        : '30-60 minutes';
    }
    if (['museum', 'gallery', 'exhibition', 'art'].some((k) => t.includes(k))) {
      return '90-150 minutes';
    }
    if (
      ['park', 'garden', 'playground', 'viewpoint', 'observation'].some((k) =>
        t.includes(k),
      )
    ) {
      return '45-90 minutes';
    }
    if (['beach', 'shore', 'coast'].some((k) => t.includes(k))) {
      return '2-3 hours';
    }
    if (
      ['mall', 'shopping', 'market', 'store', 'shop', 'bazaar'].some((k) =>
        t.includes(k),
      )
    ) {
      return '45-90 minutes';
    }
    if (
      ['landmark', 'attraction', 'monument', 'square', 'plaza', 'statue'].some(
        (k) => t.includes(k),
      )
    ) {
      return '30-75 minutes';
    }
    if (
      [
        'amusement',
        'theme park',
        'water park',
        'zoo',
        'aquarium',
        'safari',
      ].some((k) => t.includes(k))
    ) {
      return '3-5 hours';
    }
    if (
      [
        'hiking',
        'trail',
        'nature',
        'reserve',
        'national park',
        'outdoors',
      ].some((k) => t.includes(k))
    ) {
      return '2-4 hours';
    }

    return '45-90 minutes';
  }

  private buildEmptySlot(name = 'No suitable place found'): ITripSlot {
    return {
      name,
      duration: this.getDurationForPlaceType(),
      estimatedCost: 0,
    };
  }

  private dedupePlacesAcrossDays(
    generatedPlan: IGeneratedPlan,
    catalogPlaces: Array<{
      id: string;
      name: string;
      type?: string;
      tags?: string[];
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
          duration: this.getDurationForPlaceType(
            nextPlace.type,
            nextPlace.tags,
            nextPlace.name,
          ),
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
      shareVisibility: plan.shareVisibility,
      title: plan.title,
      description: plan.description,
    }));
  }

  async findPublicBrowse(
    limit: number,
  ): Promise<{ items: PublicTripBrowseItem[] }> {
    const take = Math.min(Math.max(limit, 1), 24);
    const cacheKey = `trip-plans:public-browse:${take}`;

    return this.readCache.getOrSet(
      cacheKey,
      this.publicBrowseCacheTtlMs(),
      async () => {
        const rows = await this.tripPlanRepo
          .createQueryBuilder('plan')
          .innerJoin('plan.user', 'owner')
          .select('plan.shareSlug', 'shareSlug')
          .addSelect('plan.title', 'title')
          .addSelect('plan.cityId', 'cityId')
          .addSelect('plan.createdAt', 'createdAt')
          .addSelect('owner.username', 'username')
          .where('plan.isPublic = :pub', { pub: true })
          .andWhere('plan.shareSlug IS NOT NULL')
          .andWhere("plan.shareSlug != ''")
          .andWhere('plan.userId IS NOT NULL')
          .orderBy('plan.createdAt', 'DESC')
          .take(take)
          .getRawMany<{
            shareSlug: string | null;
            title: string | null;
            username: string | null;
            cityId: string;
            createdAt: Date;
          }>();

        const items: PublicTripBrowseItem[] = rows
          .filter((row) => row.shareSlug)
          .map((row) => ({
            shareSlug: row.shareSlug as string,
            title: row.title ?? null,
            username: row.username?.trim() || 'traveler',
            cityId: row.cityId,
            createdAt: row.createdAt,
          }));

        return { items };
      },
    );
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
        this.resolvePlannerStartDate(
          tripPlan.generatedPlan?.startDate ?? tripPlan.createdAt,
        ),
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

      if (Array.isArray(tripPlan.generatedPlan?.days)) {
        let generatedPlan: IGeneratedPlan = JSON.parse(
          JSON.stringify(tripPlan.generatedPlan),
        );
        if (cityEvents.length > 0) {
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
        }
        this.annotatePlanDates(generatedPlan, start);
        generatedPlan = this.enforceSlotTypeRules(generatedPlan);
        generatedPlan = this.validateTipConsistency(generatedPlan);

        // Attach the augmented generatedPlan to the returned tripPlan object
        // without persisting it.
        (tripPlan as any).generatedPlan = generatedPlan;
      }
    } catch (err) {
      // best-effort only; swallow any errors
    }

    return tripPlan;
  }

  /**
   * Returns all place locations (lat/lng) for a trip plan so the
   * frontend can render them on an interactive map.
   */
  async getMapData(id: string, userId: string | null) {
    const tripPlan = await this.tripPlanRepo.findOne({
      where: { id },
      relations: ['city'],
    });

    if (!tripPlan) throw new NotFoundException('Trip plan not found');

    // Allow the owner OR public plans to be viewed
    if (tripPlan.userId && userId !== tripPlan.userId && !tripPlan.isPublic) {
      throw new ForbiddenException('Access denied');
    }

    const days = tripPlan.generatedPlan?.days ?? [];

    // Collect all unique placeIds from the plan
    const placeIdSet = new Set<string>();
    for (const day of days) {
      for (const slot of ['morning', 'afternoon', 'evening'] as const) {
        const s = day[slot];
        if (s?.placeId) placeIdSet.add(s.placeId);
      }
    }

    if (placeIdSet.size === 0) {
      return {
        cityCenter: this.cityCenterFromEntity(tripPlan.city),
        markers: [],
      };
    }

    // Fetch coordinates from DB — PostGIS first, lat/lng columns fallback
    const placeIds = Array.from(placeIdSet);
    let rows: Array<{
      id: string;
      name: string;
      type: string;
      lat: number | null;
      lng: number | null;
      imageUrl: string | null;
      address: string | null;
    }> = [];

    try {
      rows = await this.placeRepo
        .createQueryBuilder('p')
        .select([
          'p.id AS id',
          'p.name AS name',
          'p.type AS type',
          'p.latitude AS lat',
          'p.longitude AS lng',
          'p."imageUrl" AS "imageUrl"',
          'p.address AS address',
        ])
        .where('p.id = ANY(:ids)', { ids: placeIds })
        .getRawMany();
    } catch {
      // fallback
    }

    // Build a lookup
    const coordsById = new Map(
      rows
        .filter((r) => r.lat != null && r.lng != null)
        .map((r) => [
          r.id,
          {
            lat: Number(r.lat),
            lng: Number(r.lng),
            name: r.name,
            type: r.type,
            imageUrl: r.imageUrl ?? null,
            address: r.address ?? null,
          },
        ]),
    );

    // Build the slot order per marker: slot index for route lines
    const SLOT_COLORS: Record<string, string> = {
      morning: '#f59e0b',   // amber
      afternoon: '#10b981', // emerald
      evening: '#6366f1',   // indigo
    };

    const markers: Array<{
      placeId: string;
      name: string;
      type: string;
      lat: number;
      lng: number;
      imageUrl: string | null;
      address: string | null;
      dayNumber: number;
      slot: string;
      slotIndex: number;
      estimatedCost: number;
      duration: string;
      color: string;
    }> = [];

    for (const day of days) {
      for (const [slotIdx, slot] of (['morning', 'afternoon', 'evening'] as const).entries()) {
        const s = day[slot];
        if (!s?.placeId) continue;
        const coords = coordsById.get(s.placeId);
        if (!coords) continue;

        markers.push({
          placeId: s.placeId,
          name: s.name ?? coords.name,
          type: s.type ?? coords.type,
          lat: coords.lat,
          lng: coords.lng,
          imageUrl: s.imageUrl ?? coords.imageUrl,
          address: coords.address,
          dayNumber: day.day,
          slot,
          slotIndex: slotIdx,
          estimatedCost: s.estimatedCost ?? 0,
          duration: s.duration ?? '',
          color: SLOT_COLORS[slot] ?? '#6b7280',
        });
      }
    }

    return {
      cityCenter: this.cityCenterFromEntity(tripPlan.city),
      markers,
      currencyCode: tripPlan.generatedPlan?.days?.[0]?.morning?.currencyCode ?? 'ILS',
    };
  }

  /** Coordinate lookup for unsaved/guest trips — accepts raw place ID list. */
  async getMapDataByPlaceIds(placeIds: string[], cityId?: string) {
    if (!placeIds.length) return { cityCenter: { name: '', lat: null, lng: null }, markers: [] };

    const [rows, city] = await Promise.all([
      this.placeRepo
        .createQueryBuilder('p')
        .select(['p.id AS id', 'p.name AS name', 'p.type AS type',
          'p.latitude AS lat', 'p.longitude AS lng',
          'p."imageUrl" AS "imageUrl"', 'p.address AS address'])
        .where('p.id = ANY(:ids)', { ids: placeIds })
        .getRawMany(),
      cityId
        ? this.cityRepo.findOne({ where: { id: cityId } })
        : Promise.resolve(null),
    ]);

    const markers = rows
      .filter((r) => r.lat != null && r.lng != null)
      .map((r) => ({
        placeId: r.id,
        name: r.name,
        type: r.type,
        lat: Number(r.lat),
        lng: Number(r.lng),
        imageUrl: r.imageUrl ?? null,
        address: r.address ?? null,
        dayNumber: 1,
        slot: 'morning',
        slotIndex: 0,
        estimatedCost: 0,
        duration: '',
        color: '#6366f1',
      }));

    return {
      cityCenter: this.cityCenterFromEntity(city),
      markers,
    };
  }

  private cityCenterFromEntity(city?: { name?: string; latitude?: number | null; longitude?: number | null } | null) {
    return {
      name: city?.name ?? 'Destination',
      lat: city?.latitude != null ? Number(city.latitude) : null,
      lng: city?.longitude != null ? Number(city.longitude) : null,
    };
  }

  /** Re-sync a trip plan's days into the user's calendar (idempotent). */
  async syncToCalendar(id: string, userId: string) {
    const tripPlan = await this.tripPlanRepo.findOne({
      where: { id },
      relations: ['city'],
    });

    if (!tripPlan) throw new NotFoundException('Trip plan not found');
    if (tripPlan.userId !== userId) throw new ForbiddenException('Access denied');
    if (!tripPlan.generatedPlan?.days?.length) {
      throw new BadRequestException('Trip plan has no days to sync');
    }

    // Remove existing entries first, then re-create
    try {
      await this.calendarService.removeEntriesByTripPlan(id);
    } catch {
      // ok if none existed
    }

    await this.calendarService.createTripPlanEntries(
      userId,
      tripPlan.id,
      tripPlan.generatedPlan,
      tripPlan.title,
      tripPlan.city?.name ?? '',
    );

    return { success: true, days: tripPlan.generatedPlan.days.length };
  }

  async remove(id: string, userId: string): Promise<{ success: true }> {
    const tripPlan = await this.tripPlanRepo.findOne({ where: { id } });

    if (!tripPlan) {
      throw new NotFoundException('Trip plan not found');
    }

    if (tripPlan.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Remove associated calendar entries first
    try {
      await this.calendarService.removeEntriesByTripPlan(id);
    } catch (err) {
      this.logger.warn(
        `Failed to remove calendar entries: ${(err as Error).message}`,
      );
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

    // Fail fast: check credit balance before expensive AI call
    if (userId) {
      const available = await this.creditEngine.getAvailableBalance(userId);
      if (BigInt(available) < BigInt(AI_TRIP_GENERATION_CREDIT_COST)) {
        throw new BadRequestException(
          'Insufficient credits. Upgrade your plan or wait for monthly reset to generate more trip plans.',
        );
      }
    }

    // Resolve city from natural language prompt if cityId not provided
    if (dto.naturalLanguagePrompt && !dto.cityId) {
      const resolvedCity = await this.resolveCityFromPrompt(dto);
      if (!resolvedCity) {
        /* Log available cities for debugging */
        const sampleCities = await this.cityRepo.find({ take: 10 });
        this.logger.warn(
          `Available cities in DB: ${sampleCities.map((c) => c.name).join(', ')}`,
        );

        throw new BadRequestException(
          `Could not find a matching destination for "${dto.naturalLanguagePrompt}". Try a different destination or select from the list.`,
        );
      }
      dto.cityId = resolvedCity.id;
    }

    const city = await this.cityRepo.findOne({
      where: { id: dto.cityId },
      relations: ['country', 'country.currencies'],
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

    const selectedPlaces = filteredPlaces.length > 0 ? filteredPlaces : places;
    if (places.length === 0) {
      this.logger.warn(
        `No live place rows found for ${city.name}; falling back to a generic itinerary.`,
      );
    } else if (filteredPlaces.length === 0) {
      this.logger.warn(
        dto.interests?.length
          ? `Live places exist in ${city.name}, but none match the selected interests. Falling back to the full city catalog.`
          : `No filtered places matched for ${city.name}; falling back to the full city catalog.`,
      );
    }

    const plannerBaseDate = this.resolvePlannerStartDate(dto.startDate);
    const { start: plannerStartDate, end: plannerEndDate } =
      this.getPlannerWindow(plannerBaseDate, dto.days);

    // Fetch weather forecast and live signals in parallel — non-blocking
    const [weatherForecast, liveTravelSignalsResult] = await Promise.all([
      this.fetchWeatherForecast(city, plannerBaseDate, dto.days).catch((err) => {
        this.logger.warn(`Weather forecast unavailable: ${(err as Error).message}`);
        return [] as PerDayWeather[];
      }),
      this.collectLiveTravelSignals(city).catch((error) => {
        this.logger.warn(`Live travel signals unavailable: ${(error as Error).message}`);
        return [] as string[];
      }),
    ]);
    const liveTravelSignalsPromise = Promise.resolve(liveTravelSignalsResult);

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
      selectedPlaces.map((p) => this.imageFetcher.ensureImage(p)),
    );

    const selectedPlaceIds = new Set(selectedPlaces.map((p) => p.id));

    const budgetPerPersonPerDay = dto.budget / dto.persons / dto.days;
    const destinationName = city.stateName
      ? `${city.name} (${city.stateName})`
      : city.name;

    const normalizedPricingByPlace = await this.normalizePlacePricings(
      places,
      destinationName,
      dto.persons,
    );

    const normalizeOpeningHours = (
      openingHours: (typeof places)[number]['openingHours'],
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

    // Build enriched places with normalized pricing
    const enrichedPlaces = selectedPlaces
      .filter((p) => selectedPlaceIds.has(p.id))
      .map((p) => {
        const normalizedPricing = normalizedPricingByPlace.get(p.id);
        return {
          id: p.id,
          placeId: p.id,
          name: p.name,
          type: p.type,
          rating: p.ratingAverage,
          imageUrl: p.imageUrl ?? null,
          tags: p.tags.map((t) => t.name),
          price: normalizedPricing?.price ?? 0,
          currency: normalizedPricing?.currency ?? 'ILS',
          perPerson: normalizedPricing?.perPerson ?? false,
          openingHours: normalizeOpeningHours(p.openingHours),
          score: 50, // default; will be replaced by scoring engine
        };
      });

    // Run Destination Scoring Engine — score and rank places before sending to AI
    const scoredPlaces = this.scorePlaces(
      enrichedPlaces,
      dto.interests ?? [],
      weatherForecast,
      Math.round(budgetPerPersonPerDay),
      dto.travelerType,
    ).sort((a, b) => b.score - a.score); // highest scores first

    // Weather summary string for plan metadata
    const weatherSummary = weatherForecast.length > 0
      ? weatherForecast.map((d, i) => `Day ${i + 1}: ${d.tempC}°C, ${d.condition}`).join(' | ')
      : undefined;

    // Build per-day context (day-of-week, closed places, weather)
    // Strip imageUrl from places before sending to AI — not needed by AI, wastes tokens
    const placesForAi = scoredPlaces.map(({ imageUrl: _img, ...rest }) => rest);
    const tripDayContexts = this.buildTripDayContexts(
      plannerStartDate,
      dto.days,
      placesForAi,
      weatherForecast,
    );

    const context = {
      cityId: city.id,
      destinationName,
      days: dto.days,
      budget: dto.budget,
      persons: dto.persons,
      budgetPerPersonPerDay: Math.round(budgetPerPersonPerDay),
      travelerType: dto.travelerType,
      mobilityLevel: dto.mobilityLevel,
      ageGroups: dto.ageGroups,
      interests: dto.interests,
      weatherForecast,
      tripDays: tripDayContexts,
      currencyCode: dto.currencyCode ?? city.country?.currencies?.[0]?.code ?? 'ILS',
      places: placesForAi,
      events: cityEvents.map((e) => ({
        id: e.id,
        name: e.title,
        price: e.ticketPrice,
        ticketPrice: e.ticketPrice,
        currency: e.currencyCode,
        startDate: e.startDate,
        endDate: e.endDate,
        venue: e.venue?.name,
        venueId: e.venue?.id,
        imageUrl: e.venue?.imageUrl ?? null,
      })),
    };

    let generatedPlan: IGeneratedPlan;
    const useAiTripGeneration =
      String(process.env.TRIP_PLANNER_USE_AI ?? 'false') === 'true';

    if (useAiTripGeneration) {
      // Build prompt once — used for both cache key and AI generation
      const prompt = this.geminiService.buildPrompt(context);

      // Step 1 & 2: Check semantic cache (Redis exact match → PGVector similarity)
      const cached = await this.tripCacheService.lookup(prompt).catch(() => undefined);
      if (cached) {
        generatedPlan = cached;
        this.logger.log('Serving itinerary from semantic cache');
      } else {
        // Step 3: Cache miss — call AI, then store result
        try {
          generatedPlan = await this.generateTripPlanWithTimeout(context);
        } catch (err) {
          if (err instanceof GeminiQuotaExceededError) {
            this.logger.warn(
              `AI quota exceeded, falling back to rule-based plan: ${err.detail ?? err.message}`,
            );
          } else {
            this.logger.warn(
              `AI trip generation failed, falling back to rule-based plan: ${String(err)}`,
            );
          }
          generatedPlan = this.buildRuleBasedPlan(context);
        }

        // Fire-and-forget cache store (never blocks the response)
        this.tripCacheService.store(context, prompt, generatedPlan).catch((cacheErr) =>
          this.logger.warn(`Semantic cache store skipped: ${(cacheErr as Error).message}`),
        );
      }
    } else {
      generatedPlan = this.buildRuleBasedPlan(context);
    }

    // Validate and fix the generated plan against ground-truth data
    try {
      if (generatedPlan && Array.isArray(generatedPlan.days)) {
        generatedPlan = this.validateAndFixPlan(generatedPlan, context);
      }
    } catch (err) {
      this.logger.warn(
        `Plan validation failed, using raw output: ${String(err)}`,
      );
    }

    // Enforce slot-type rules: landmarks → morning, restaurants → evening, etc.
    // Must run BEFORE tip consistency check so tips reference corrected positions.
    try {
      if (generatedPlan && Array.isArray(generatedPlan.days)) {
        generatedPlan = this.enforceSlotTypeRules(generatedPlan);
      }
    } catch (err) {
      this.logger.warn(`Slot-type enforcement skipped: ${String(err)}`);
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

        // Optimize per-day place order by geographic proximity using PostGIS.
        try {
          generatedPlan = await this.geoRoutingService.optimizePlan(
            generatedPlan,
            city.latitude ? Number(city.latitude) : undefined,
            city.longitude ? Number(city.longitude) : undefined,
          );
        } catch (geoErr) {
          this.logger.warn(
            `Geo-routing optimization skipped: ${(geoErr as Error).message}`,
          );
        }

        this.annotatePlanDates(generatedPlan, plannerStartDate);
        this.appendLiveTravelTips(
          generatedPlan,
          await liveTravelSignalsPromise,
        );

        // Remove tips that contradict the actual slot assignments.
        // Must run AFTER all slot movements (geo-routing, enforce-slot, inject-events).
        try {
          generatedPlan = this.validateTipConsistency(generatedPlan);
        } catch (err) {
          this.logger.warn(`Tip consistency check skipped: ${String(err)}`);
        }

        // Attach per-day weather summaries to each day (match by date, not index)
        if (weatherForecast.length > 0) {
          const weatherByDate = new Map(weatherForecast.map((wf) => [wf.date, wf]));
          generatedPlan.days = generatedPlan.days.map((day) => {
            const dayDate = day.date ? this.formatLocalDate(new Date(day.date)) : null;
            const weather = dayDate ? weatherByDate.get(dayDate) : undefined;
            if (weather) {
              return { ...day, weather: `${weather.tempC}°C, ${weather.condition}` };
            }
            return day;
          });
        }
      }
    } catch (err) {
      // Swallow errors here; this augmentation is best-effort only.
    }

    // Attach plan-level intelligence metadata (best-effort)
    try {
      if (generatedPlan) {
        generatedPlan.budgetBreakdown = this.buildBudgetBreakdown(
          generatedPlan,
          dto.budget,
          dto.persons,
          dto.travelerType,
        );
        if (dto.travelerType) {
          generatedPlan.travelerProfile = dto.travelerType;
        }
        if (weatherSummary) {
          generatedPlan.weatherSummary = weatherSummary;
        }
        // Calculate quality score using the normalized pricing map for completeness info
        generatedPlan.confidenceScore = this.calculateTripQualityScore(
          generatedPlan,
          dto.budget,
          dto.travelerType,
          normalizedPricingByPlace as unknown as Map<string, { estimated: boolean }>,
        );
      }
    } catch {
      // best-effort
    }

    // Fire-and-forget visual media enrichment (never blocks the response)
    if (generatedPlan) {
      this.mediaEnrichment
        .enrichPlan(generatedPlan, city.name)
        .then((enriched) => {
          Object.assign(generatedPlan, enriched);
        })
        .catch((mediaErr) =>
          this.logger.warn(`Media enrichment skipped: ${(mediaErr as Error).message}`),
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

    // Charge credits atomically — if this fails, roll back the saved plan
    try {
      await this.creditEngine.charge(userId, AI_TRIP_GENERATION_CREDIT_COST, {
        feature: 'ai-trip-generation',
        context: { cityId: city.id, cityName: city.name, days: dto.days },
        referenceId: tripPlan.id,
      });
    } catch (err) {
      // Roll back the plan since we couldn't charge
      await this.tripPlanRepo
        .remove(tripPlan)
        .catch((removeErr) =>
          this.logger.error(
            `Failed to clean up trip plan ${tripPlan.id} after charge failure: ${(removeErr as Error).message}`,
          ),
        );
      this.logger.error(
        `Failed to charge credits for trip plan ${tripPlan.id}: ${(err as Error).message}`,
      );
      throw err; // Let the caller know generation failed
    }

    // Log usage (best-effort, never blocks the response)
    this.usage
      .logUsage({
        user: { id: userId } as any,
        feature: 'ai-trip-generation',
        costCredits: AI_TRIP_GENERATION_CREDIT_COST,
        source: UsageSource.WEB,
        context: { cityId: city.id, cityName: city.name, days: dto.days },
      })
      .catch((logErr) =>
        this.logger.error(
          `Failed to log usage for trip plan ${tripPlan.id}: ${(logErr as Error).message}`,
        ),
      );

    // Auto-create calendar entries for each itinerary day
    const addToCalendar = dto.addToCalendar !== false;
    if (addToCalendar) {
      try {
        await this.calendarService.createTripPlanEntries(
          userId,
          tripPlan.id,
          generatedPlan,
          null,
          city.name,
        );
      } catch (err) {
        this.logger.warn(
          `Failed to create calendar entries: ${(err as Error).message}`,
        );
      }
    }

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
      startDate?: string | null;
      addToCalendar?: boolean;
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

    this.annotatePlanDates(
      tripPlan.generatedPlan,
      this.resolvePlannerStartDate(
        dto.startDate ?? tripPlan.generatedPlan?.startDate ?? new Date(),
      ),
    );

    await this.tripPlanRepo.save(tripPlan);

    // Charge credits atomically — roll back plan on failure
    try {
      await this.creditEngine.charge(userId, AI_TRIP_GENERATION_CREDIT_COST, {
        feature: 'ai-trip-generation',
        context: { cityId: dto.cityId, cityName: city.name, days: dto.days },
        referenceId: tripPlan.id,
      });
    } catch (err) {
      await this.tripPlanRepo
        .remove(tripPlan)
        .catch((removeErr) =>
          this.logger.error(
            `Failed to clean up imported trip plan ${tripPlan.id}: ${(removeErr as Error).message}`,
          ),
        );
      throw err;
    }

    // Log usage best-effort
    this.usage
      .logUsage({
        user: { id: userId } as any,
        feature: 'ai-trip-generation',
        costCredits: AI_TRIP_GENERATION_CREDIT_COST,
        source: UsageSource.WEB,
        context: { cityId: dto.cityId, cityName: city.name, days: dto.days },
      })
      .catch((logErr) =>
        this.logger.error(
          `Failed to log usage for imported trip ${tripPlan.id}: ${(logErr as Error).message}`,
        ),
      );

    // Auto-create calendar entries for each itinerary day
    const addToCalendar = dto.addToCalendar !== false;
    if (addToCalendar) {
      try {
        const title = tripPlan.title || null;
        await this.calendarService.createTripPlanEntries(
          userId,
          tripPlan.id,
          tripPlan.generatedPlan,
          title,
          city.name,
        );
      } catch (err) {
        this.logger.warn(
          `Failed to create calendar entries: ${(err as Error).message}`,
        );
      }
    }

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
      tags?: string[];
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

    const normalizeType = (value?: string) =>
      this.normalizeText(value).replace(/[_-]+/g, ' ').trim();

    const slotFromPlace = (p: (typeof places)[0]): ITripSlot => {
      const oh = p.openingHours?.[0];
      return {
        placeId: p.id,
        name: p.name,
        type: p.type,
        duration: this.getDurationForPlaceType(p.type, p.tags ?? [], p.name),
        estimatedCost: estimate(p),
        openTime: oh?.open,
        closeTime: oh?.close,
      };
    };

    const orderByPriority = (
      pool: typeof places,
      priorities: string[],
    ): typeof places => {
      const ranked = [...pool].sort((left, right) => {
        const leftType = normalizeType(left.type);
        const rightType = normalizeType(right.type);
        const leftPriority = priorities.findIndex((token) =>
          leftType.includes(token),
        );
        const rightPriority = priorities.findIndex((token) =>
          rightType.includes(token),
        );

        const priorityDelta =
          (leftPriority === -1 ? 999 : leftPriority) -
          (rightPriority === -1 ? 999 : rightPriority);
        if (priorityDelta !== 0) return priorityDelta;

        const ratingDelta =
          (Number(right.rating) || 0) - (Number(left.rating) || 0);
        if (ratingDelta !== 0) return ratingDelta;

        return estimate(left) - estimate(right);
      });

      return ranked;
    };

    const pickNext = (
      pool: typeof places,
      usedIds: Set<string>,
    ): (typeof places)[0] | null => {
      const next = pool.find((place) => !usedIds.has(place.id));
      if (!next) return null;
      usedIds.add(next.id);
      return next;
    };

    const dayTemplates = {
      morning: [
        'landmark',
        'museum',
        'heritage',
        'histor',
        'church',
        'mosque',
        'religious',
        'monument',
        'viewpoint',
        'old town',
      ],
      afternoon: [
        'activity',
        'tour',
        'attraction',
        'gallery',
        'market',
        'park',
        'nature',
        'adventure',
        'walk',
      ],
      evening: [
        'cafe',
        'coffee',
        'restaurant',
        'dining',
        'bar',
        'lounge',
        'bakery',
        'food',
      ],
    };

    const buildDay = (
      dayNumber: number,
      pools: {
        morning: typeof places;
        afternoon: typeof places;
        evening: typeof places;
      },
      usedIds: Set<string>,
      eventIndex: number,
    ) => {
      const morningPlace = pickNext(pools.morning, usedIds);
      const morning = morningPlace
        ? slotFromPlace(morningPlace)
        : this.buildEmptySlot(destinationName);

      let afternoon: ITripSlot;
      let nextEventIndex = eventIndex;
      if (dayNumber === 1 && events[nextEventIndex]) {
        const ev = events[nextEventIndex];
        nextEventIndex += 1;
        afternoon = {
          name: ev.name,
          duration: '2 hours',
          estimatedCost: Math.round((Number(ev.price) || 0) * persons),
        };
      } else {
        const afternoonPlace = pickNext(pools.afternoon, usedIds);
        afternoon = afternoonPlace
          ? slotFromPlace(afternoonPlace)
          : this.buildEmptySlot(destinationName);
      }

      const eveningPlace = pickNext(pools.evening, usedIds);
      const evening = eveningPlace
        ? slotFromPlace(eveningPlace)
        : this.buildEmptySlot(destinationName);

      const totalDayCost =
        morning.estimatedCost + afternoon.estimatedCost + evening.estimatedCost;

      return {
        day: dayNumber,
        morning,
        afternoon,
        evening,
        totalDayCost,
        nextEventIndex,
      };
    };

    const buildDays = (pool: typeof places): ITripDay[] => {
      if (pool.length === 0) {
        return Array.from({ length: numDays }, (_, index) => {
          const day = index + 1;
          return {
            day,
            morning: this.buildEmptySlot(destinationName),
            afternoon:
              day === 1 && events[0]
                ? {
                    name: events[0].name,
                    duration: '2 hours',
                    estimatedCost: Math.round(
                      (Number(events[0].price) || 0) * persons,
                    ),
                  }
                : this.buildEmptySlot(destinationName),
            evening: this.buildEmptySlot(destinationName),
            totalDayCost:
              day === 1 && events[0]
                ? Math.round((Number(events[0].price) || 0) * persons)
                : 0,
          };
        });
      }

      const sortedByMorning = orderByPriority(pool, dayTemplates.morning);
      const sortedByAfternoon = orderByPriority(pool, dayTemplates.afternoon);
      const sortedByEvening = orderByPriority(pool, dayTemplates.evening);
      const usedIds = new Set<string>();

      const daysOut: ITripDay[] = [];
      let eventIndex = 0;

      for (let dayNumber = 1; dayNumber <= numDays; dayNumber++) {
        const result = buildDay(
          dayNumber,
          {
            morning: sortedByMorning,
            afternoon: sortedByAfternoon,
            evening: sortedByEvening,
          },
          usedIds,
          eventIndex,
        );

        eventIndex = result.nextEventIndex;
        daysOut.push({
          day: result.day,
          morning: result.morning,
          afternoon: result.afternoon,
          evening: result.evening,
          totalDayCost: result.totalDayCost,
        });
      }

      const total = daysOut.reduce((sum, day) => sum + day.totalDayCost, 0);
      if (total > budget) {
        const cheapByMorning = orderByPriority(
          [...pool].sort((a, b) => estimate(a) - estimate(b)),
          dayTemplates.morning,
        );
        const cheapByAfternoon = orderByPriority(
          [...pool].sort((a, b) => estimate(a) - estimate(b)),
          dayTemplates.afternoon,
        );
        const cheapByEvening = orderByPriority(
          [...pool].sort((a, b) => estimate(a) - estimate(b)),
          dayTemplates.evening,
        );
        const fallbackUsedIds = new Set<string>();
        const fallbackDays: ITripDay[] = [];
        let fallbackEventIndex = 0;

        for (let dayNumber = 1; dayNumber <= numDays; dayNumber++) {
          const result = buildDay(
            dayNumber,
            {
              morning: cheapByMorning,
              afternoon: cheapByAfternoon,
              evening: cheapByEvening,
            },
            fallbackUsedIds,
            fallbackEventIndex,
          );
          fallbackEventIndex = result.nextEventIndex;
          fallbackDays.push({
            day: result.day,
            morning: result.morning,
            afternoon: result.afternoon,
            evening: result.evening,
            totalDayCost: result.totalDayCost,
          });
        }

        return fallbackDays;
      }

      return daysOut;
    };

    const days = buildDays(places);
    const totalEstimatedCost = days.reduce(
      (sum, day) => sum + day.totalDayCost,
      0,
    );

    const tips: string[] = [
      `Destination: ${destinationName}.`,
      'Start early for landmarks, museums, and heritage stops, then move cafes and restaurants to later in the day.',
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
    context: {
      places: Array<{
        id: string;
        name: string;
        type?: string;
        price: number;
        perPerson?: boolean;
        tags: string[];
        openingHours: Array<{
          day: number;
          open: string | null;
          close: string | null;
        }>;
      }>;
      persons: number;
    },
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

        // Fix name to exact DB name (AI may hallucinate modifications)
        slot.name = place.name;
        slot.type = place.type;
        slot.duration = this.getDurationForPlaceType(
          place.type,
          place.tags ?? [],
          place.name,
        );

        // Force religious places to FREE
        const tags: string[] = place.tags ?? [];
        const isReligious = tags.some(
          (t: string) => String(t).toLowerCase() === 'religious',
        );
        const basePrice = isReligious ? 0 : Number(place.price) || 0;

        // Recalculate cost from ground truth (ignore AI hallucinated prices)
        const recalculated = place.perPerson
          ? basePrice * context.persons
          : basePrice;
        slot.estimatedCost = Math.max(0, Math.round(recalculated));

        // Fix opening hours from DB
        const oh = place.openingHours?.[0];
        if (oh) {
          slot.openTime = oh.open;
          slot.closeTime = oh.close;
        }
      }

      day.totalDayCost =
        Math.max(0, day.morning?.estimatedCost ?? 0) +
        Math.max(0, day.afternoon?.estimatedCost ?? 0) +
        Math.max(0, day.evening?.estimatedCost ?? 0);
    }

    plan.totalEstimatedCost = plan.days.reduce(
      (sum, d) => sum + Math.max(0, d.totalDayCost ?? 0),
      0,
    );

    return plan;
  }

  private async resolveCityFromPrompt(
    dto: CreateTripPlannerDto,
  ): Promise<City | null> {
    if (dto.naturalLanguagePrompt) {
      const promptMatch = await this.matchCityByName(dto.naturalLanguagePrompt);
      if (promptMatch) return promptMatch;
    }

    /* Use pre-extracted city name if provided by frontend (Puter AI) */
    if (dto.naturalLanguageCity) {
      const match = await this.matchCityByName(
        dto.naturalLanguageCity,
        dto.naturalLanguageCountry,
      );
      if (match) return match;
    }

    /* Last resort: use backend AI (Gemini) to extract city from raw prompt */
    try {
      const aiResult = await this.geminiService.generateAssistantText(
        `Extract the English city name and English country name from this text. Return ONLY "City|Country" format. Example: "Bethlehem|Palestine". No other text.

Text: "${dto.naturalLanguagePrompt}"

Result:`,
      );

      const parts = aiResult.split('|').map((s) => s.trim());
      const cityName = parts[0];
      const countryName = parts.length > 1 ? parts[1] : '';

      return this.matchCityByName(cityName, countryName);
    } catch (err) {
      this.logger.warn(`Failed to resolve city from prompt: ${String(err)}`);
    }

    return null;
  }

  private async matchCityByName(
    searchText: string,
    countryName?: string,
  ): Promise<City | null> {
    const normalizedSearch = this.normalizeSearchText(searchText);
    if (!normalizedSearch) return null;

    const normalizedCountry = this.normalizeSearchText(countryName);

    const directQuery = this.cityRepo
      .createQueryBuilder('city')
      .leftJoinAndSelect('city.country', 'country')
      .where('LOWER(city.name) = :q', { q: normalizedSearch });

    if (normalizedCountry) {
      directQuery.andWhere('LOWER(country.name) LIKE :cy', {
        cy: `%${normalizedCountry}%`,
      });
    }

    const directMatch = await directQuery.getOne();
    if (directMatch) return directMatch;

    const looseQuery = this.cityRepo
      .createQueryBuilder('city')
      .leftJoinAndSelect('city.country', 'country')
      .where('LOWER(city.name) LIKE :q', { q: `%${normalizedSearch}%` });

    if (normalizedCountry) {
      looseQuery.andWhere('LOWER(country.name) LIKE :cy', {
        cy: `%${normalizedCountry}%`,
      });
    }

    const looseMatch = await looseQuery.getOne();
    if (looseMatch) return looseMatch;

    const cities = await this.cityRepo.find({ relations: ['country'] });
    let bestCity: City | null = null;
    let bestScore = 0;

    for (const city of cities) {
      const score = this.scoreCityMatch(searchText, city, countryName);
      if (score > bestScore) {
        bestScore = score;
        bestCity = city;
      }
    }

    return bestScore >= 55 ? bestCity : null;
  }

  /**
   * Dynamically replan a single day of an existing trip.
   * Only the affected day is replaced — all other days remain intact.
   */
  async replanDay(
    tripPlanId: string,
    userId: string,
    dayNumber: number,
    reason?: string,
  ): Promise<TripPlan> {
    const tripPlan = await this.tripPlanRepo.findOne({
      where: { id: tripPlanId },
      relations: ['city', 'city.country', 'city.country.currencies'],
    });

    if (!tripPlan) {
      throw new NotFoundException('Trip plan not found');
    }

    if (tripPlan.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (!tripPlan.generatedPlan?.days?.length) {
      throw new BadRequestException('Trip plan has no generated days to replan');
    }

    const dayIndex = dayNumber - 1;
    if (dayIndex < 0 || dayIndex >= tripPlan.generatedPlan.days.length) {
      throw new BadRequestException(
        `Day ${dayNumber} is out of range (plan has ${tripPlan.generatedPlan.days.length} days)`,
      );
    }

    const city = tripPlan.city;
    const persons = tripPlan.persons || 1;

    // Collect place IDs already used on OTHER days
    const usedPlaceIds = new Set<string>();
    tripPlan.generatedPlan.days.forEach((day, i) => {
      if (i === dayIndex) return;
      for (const slot of [day.morning, day.afternoon, day.evening]) {
        if (slot?.placeId) usedPlaceIds.add(slot.placeId);
      }
    });

    // Fetch all available places for this city
    const allPlaces = await this.placeRepo.find({
      where: { city: { id: city.id }, isActive: true },
      relations: ['pricings', 'openingHours', 'tags'],
    });

    // Find fresh weather for the specific day
    const dayDate = tripPlan.generatedPlan.days[dayIndex].date
      ? new Date(tripPlan.generatedPlan.days[dayIndex].date!)
      : new Date();

    const weatherForecast = await this.fetchWeatherForecast(city, dayDate, 1).catch(() => [] as PerDayWeather[]);

    const normalizedPricingByPlace = await this.normalizePlacePricings(
      allPlaces,
      city.stateName ? `${city.name} (${city.stateName})` : city.name,
      persons,
    );

    // Score and rank places that haven't been used yet
    const freshPlaces = allPlaces
      .filter((p) => !usedPlaceIds.has(p.id))
      .map((p) => {
        const pricing = normalizedPricingByPlace.get(p.id);
        return {
          id: p.id,
          placeId: p.id,
          name: p.name,
          type: p.type,
          rating: p.ratingAverage,
          imageUrl: p.imageUrl ?? null,
          tags: p.tags.map((t) => t.name),
          price: pricing?.price ?? 0,
          currency: pricing?.currency ?? 'ILS',
          perPerson: pricing?.perPerson ?? false,
          openingHours: p.openingHours
            .filter((h): h is typeof h & { dayOfWeek: number } => h.dayOfWeek !== null)
            .map((h) => ({ day: h.dayOfWeek, open: h.openTime, close: h.closeTime })),
          score: 50,
        };
      });

    const budget = Number(tripPlan.budget);
    const days = tripPlan.days || 1;
    const budgetPerPersonPerDay = Math.round(budget / persons / days);

    const scoredFreshPlaces = this.scorePlaces(
      freshPlaces,
      [],
      weatherForecast,
      budgetPerPersonPerDay,
      tripPlan.generatedPlan.travelerProfile,
    ).sort((a, b) => b.score - a.score);

    // Use rule-based approach to build the replacement day
    const dayPlan = this.buildRuleBasedPlan({
      destinationName: city.stateName ? `${city.name} (${city.stateName})` : city.name,
      days: 1,
      budget: budgetPerPersonPerDay * persons,
      persons,
      places: scoredFreshPlaces,
      events: [],
    });

    if (!dayPlan.days[0]) {
      throw new BadRequestException('Could not generate a replacement day — no alternative places available');
    }

    const replacementDay = {
      ...dayPlan.days[0],
      day: dayNumber,
      date: tripPlan.generatedPlan.days[dayIndex].date,
      weather: weatherForecast[0]
        ? `${weatherForecast[0].tempC}°C, ${weatherForecast[0].condition}`
        : undefined,
    };

    // Append replan tip
    const replanTip = reason
      ? `Day ${dayNumber} was replanned due to: ${reason}.`
      : `Day ${dayNumber} was replanned with fresh alternatives.`;

    // Splice the new day into the plan (immutably)
    const updatedDays = tripPlan.generatedPlan.days.map((d, i) =>
      i === dayIndex ? replacementDay : d,
    );

    let updatedPlan: IGeneratedPlan = {
      ...tripPlan.generatedPlan,
      days: updatedDays,
      totalEstimatedCost: updatedDays.reduce((sum, d) => sum + (d.totalDayCost ?? 0), 0),
      tips: [...(tripPlan.generatedPlan.tips ?? []).slice(0, 7), replanTip],
    };

    // Apply slot-type rules and tip consistency to the fresh day
    updatedPlan = this.enforceSlotTypeRules(updatedPlan);
    updatedPlan = this.validateTipConsistency(updatedPlan);

    tripPlan.generatedPlan = updatedPlan;
    await this.tripPlanRepo.save(tripPlan);

    return tripPlan;
  }
}
