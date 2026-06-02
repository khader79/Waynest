import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRedisClient } from '../common/utils/redis-client';
import { createHash } from 'crypto';
import { ITripSlot, ITripDay, IGeneratedPlan } from './entities/trip-planner.entity';

const PLACEHOLDER_URL =
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=75';

const FALLBACK_PLACEHOLDER_URL =
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=75';

const REDIS_PREFIX = 'media:place:';
const REDIS_TTL_SEC = 7 * 86400;
const UNSPLASH_BASE = 'https://api.unsplash.com/search/photos';
const PER_PAGE = 1;
const ORIENTATION = 'landscape';

type UnsplashPhoto = {
  urls: { regular: string; small: string; raw: string };
  alt_description: string | null;
};

type UnsplashSearchResponse = {
  results: UnsplashPhoto[];
  total: number;
};

function cleanPlaceName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s\-'']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function redisKey(name: string): string {
  return REDIS_PREFIX + createHash('sha256').update(name).digest('hex');
}

@Injectable()
export class MediaEnrichmentService {
  private readonly logger = new Logger(MediaEnrichmentService.name);
  private readonly unsplashKey: string | null;

  constructor(config: ConfigService) {
    const key = config.get<string>('UNSPLASH_ACCESS_KEY');
    this.unsplashKey = key?.trim() || null;
  }

  async enrichPlan(plan: IGeneratedPlan, destinationName: string): Promise<IGeneratedPlan> {
    if (!plan?.days) return plan;

    const allSlots: Array<{ dayIdx: number; slotKey: string; slot: ITripSlot }> = [];
    for (let di = 0; di < plan.days.length; di++) {
      const day = plan.days[di];
      for (const key of ['morning', 'afternoon', 'evening'] as const) {
        const slot = day[key];
        if (slot && slot.name) {
          allSlots.push({ dayIdx: di, slotKey: key, slot });
        }
      }
    }

    if (allSlots.length === 0) return plan;

    const results = await Promise.allSettled(
      allSlots.map(async ({ dayIdx, slotKey, slot }) => {
        const imageUrl = await this.fetchImageForPlace(slot.name, destinationName);
        plan.days[dayIdx][slotKey] = { ...slot, imageUrl: imageUrl ?? null };
      }),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.warn(`Slot enrichment failed: ${(result.reason as Error).message}`);
      }
    }

    return plan;
  }

  async fetchImageForPlace(placeName: string, destinationName?: string): Promise<string | null> {
    const cleaned = cleanPlaceName(placeName);

    if (!cleaned) {
      return this.getFallbackImage(placeName);
    }

    const cached = await this.readFromCache(cleaned);
    if (cached !== undefined) return cached;

    const imageUrl = await this.searchUnsplash(cleaned, destinationName);
    await this.writeToCache(cleaned, imageUrl);

    return imageUrl;
  }

  private async readFromCache(cleanedName: string): Promise<string | null | undefined> {
    try {
      const redis = getRedisClient();
      if (!redis) return undefined;

      const cached = await redis.get(redisKey(cleanedName));
      if (cached === null) return undefined;

      this.logger.log(`Media cache HIT for "${cleanedName}"`);
      return cached as string;
    } catch (err) {
      this.logger.warn(`Media cache read failed: ${(err as Error).message}`);
      return undefined;
    }
  }

  private async writeToCache(cleanedName: string, url: string | null): Promise<void> {
    try {
      const redis = getRedisClient();
      if (!redis) return;

      const key = redisKey(cleanedName);
      if (url) {
        await redis.setEx(key, REDIS_TTL_SEC, url);
      } else {
        await redis.setEx(key, REDIS_TTL_SEC, '');
      }

      if (url) {
        this.logger.log(`Media cache MISS — cached image for "${cleanedName}"`);
      }
    } catch (err) {
      this.logger.warn(`Media cache write failed: ${(err as Error).message}`);
    }
  }

  private async searchUnsplash(
    cleanedName: string,
    destinationName?: string,
  ): Promise<string | null> {
    if (!this.unsplashKey) {
      this.logger.warn('UNSPLASH_ACCESS_KEY not set, using fallback images');
      return this.getFallbackImage(cleanedName);
    }

    try {
      const query = destinationName
        ? `${cleanedName} ${cleanPlaceName(destinationName)} landmark`
        : `${cleanedName} landmark`;

      const url = `${UNSPLASH_BASE}?query=${encodeURIComponent(query)}&per_page=${PER_PAGE}&orientation=${ORIENTATION}&content_filter=high`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Client-ID ${this.unsplashKey}`,
          'Accept-Version': 'v1',
        },
        signal: AbortSignal.timeout(4000),
      });

      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          this.logger.warn(`Unsplash rate limited (${response.status}), using fallback`);
          return this.getFallbackImage(cleanedName);
        }
        this.logger.warn(`Unsplash error ${response.status}, using fallback`);
        return this.getFallbackImage(cleanedName);
      }

      const body = (await response.json()) as UnsplashSearchResponse;

      if (body.results?.[0]?.urls?.regular) {
        const photo = body.results[0];
        const imageUrl = `${photo.urls.regular}&auto=format&fit=crop&w=800&q=75`;
        this.logger.log(`Unsplash found image for "${cleanedName}"`);
        return imageUrl;
      }

      this.logger.log(`Unsplash no results for "${cleanedName}", trying destination fallback`);
      return this.tryDestinationFallback(destinationName);
    } catch (err) {
      this.logger.warn(`Unsplash search failed: ${(err as Error).message}`);
      return this.getFallbackImage(cleanedName);
    }
  }

  private async tryDestinationFallback(destinationName?: string): Promise<string | null> {
    if (!destinationName) return this.getFallbackImage('');

    const cleaned = cleanPlaceName(destinationName);
    if (!cleaned) return this.getFallbackImage('');

    if (!this.unsplashKey) return this.getFallbackImage(cleaned);

    try {
      const query = `${cleaned} travel destination landmark`;
      const url = `${UNSPLASH_BASE}?query=${encodeURIComponent(query)}&per_page=${PER_PAGE}&orientation=${ORIENTATION}&content_filter=high`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Client-ID ${this.unsplashKey}`,
          'Accept-Version': 'v1',
        },
        signal: AbortSignal.timeout(4000),
      });

      if (!response.ok) return this.getFallbackImage(cleaned);

      const body = (await response.json()) as UnsplashSearchResponse;
      if (body.results?.[0]?.urls?.regular) {
        return `${body.results[0].urls.regular}&auto=format&fit=crop&w=800&q=75`;
      }

      return this.getFallbackImage(cleaned);
    } catch {
      return this.getFallbackImage(cleaned);
    }
  }

  private getFallbackImage(_context?: string): string {
    return FALLBACK_PLACEHOLDER_URL;
  }
}
