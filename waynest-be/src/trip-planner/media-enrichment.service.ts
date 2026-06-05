import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRedisClient } from '../common/utils/redis-client';
import { createHash } from 'crypto';
import { ITripSlot, ITripDay, IGeneratedPlan } from './entities/trip-planner.entity';

// Generic travel placeholder (Pexels — no key needed, CDN direct link)
const FALLBACK_PLACEHOLDER_URL =
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=75';

const REDIS_PREFIX = 'media:place:';
const REDIS_TTL_SEC = 7 * 86400;
const UNSPLASH_BASE = 'https://api.unsplash.com/search/photos';
const PER_PAGE = 1;
const ORIENTATION = 'landscape';

// Google Places APIs
const GP_SEARCH_BASE = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json';
const GP_DETAILS_BASE = 'https://maps.googleapis.com/maps/api/place/details/json';
const GP_PHOTO_BASE  = 'https://maps.googleapis.com/maps/api/place/photo';

type UnsplashPhoto = {
  urls: { regular: string; small: string; raw: string };
  alt_description: string | null;
};

type UnsplashSearchResponse = {
  results: UnsplashPhoto[];
  total: number;
};

function cleanPlaceName(name: string): string {
  // Preserve Arabic, Hebrew, CJK etc. \u2014 only collapse whitespace and lower-case
  return name.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
}

function redisKey(name: string): string {
  return REDIS_PREFIX + createHash('sha256').update(name).digest('hex');
}

@Injectable()
export class MediaEnrichmentService {
  private readonly logger = new Logger(MediaEnrichmentService.name);
  private readonly unsplashKey: string | null;
  private readonly googlePlacesKey: string | null;

  constructor(config: ConfigService) {
    const uKey = config.get<string>('UNSPLASH_ACCESS_KEY');
    this.unsplashKey = uKey?.trim() || null;

    const gKey = config.get<string>('GOOGLE_PLACES_KEY');
    this.googlePlacesKey = gKey?.trim() || null;

    if (!this.unsplashKey && !this.googlePlacesKey) {
      this.logger.warn('No image API keys configured (UNSPLASH_ACCESS_KEY or GOOGLE_PLACES_KEY). Using placeholder images.');
    }
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

  /** Try Google Places first, then Unsplash, then placeholder. */
  private async searchUnsplash(
    cleanedName: string,
    destinationName?: string,
  ): Promise<string | null> {
    // ── 1. Google Places (no extra key needed — reuses GOOGLE_PLACES_KEY) ──
    if (this.googlePlacesKey) {
      try {
        const gpImg = await this.fetchGooglePlacesImage(cleanedName, destinationName);
        if (gpImg) return gpImg;
      } catch (err) {
        this.logger.debug(`Google Places image fetch failed for "${cleanedName}": ${(err as Error).message}`);
      }
    }

    // ── 2. Unsplash (optional key) ──────────────────────────────────────────
    if (!this.unsplashKey) {
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

  /**
   * Fetch a real Google Places photo for a given place name.
   * Uses 4 strategies in order to maximise hit rate:
   *   1. findplacefromtext (name + destination) → details → photo
   *   2. textsearch        (name + destination) → photos directly or details → photo
   *   3. findplacefromtext (name only)
   *   4. textsearch        (name only)
   */
  private async fetchGooglePlacesImage(
    placeName: string,
    destinationName?: string,
  ): Promise<string | null> {
    if (!this.googlePlacesKey) return null;

    const withDest  = destinationName ? `${placeName} ${destinationName}` : placeName;
    const nameOnly  = placeName;
    const tryName   = Boolean(destinationName);

    const photoRef =
      (await this.gpFindFromText(withDest)) ??
      (await this.gpTextSearch(withDest))   ??
      (tryName ? (await this.gpFindFromText(nameOnly)) : null) ??
      (tryName ? (await this.gpTextSearch(nameOnly))   : null);

    if (!photoRef) return null;

    // Follow redirect to get CDN URL — never expose API key to frontend
    return this.gpResolveCdnUrl(photoRef);
  }

  private async gpFindFromText(query: string): Promise<string | null> {
    try {
      const res = await fetch(
        `${GP_SEARCH_BASE}?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id&key=${this.googlePlacesKey}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { candidates?: Array<{ place_id?: string }> };
      const placeId = data?.candidates?.[0]?.place_id;
      if (!placeId) return null;
      return this.gpGetPhotoRef(placeId);
    } catch {
      return null;
    }
  }

  private async gpTextSearch(query: string): Promise<string | null> {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${this.googlePlacesKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const data = (await res.json()) as { results?: Array<{ place_id?: string; photos?: Array<{ photo_reference?: string }> }> };
      const first = data?.results?.[0];
      if (!first) return null;
      // textsearch may return photos directly — saves one API call
      if (first.photos?.[0]?.photo_reference) return first.photos[0].photo_reference;
      if (first.place_id) return this.gpGetPhotoRef(first.place_id);
      return null;
    } catch {
      return null;
    }
  }

  private async gpGetPhotoRef(placeId: string): Promise<string | null> {
    try {
      const res = await fetch(
        `${GP_DETAILS_BASE}?place_id=${placeId}&fields=photos&key=${this.googlePlacesKey}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { result?: { photos?: Array<{ photo_reference?: string }> } };
      return data?.result?.photos?.[0]?.photo_reference ?? null;
    } catch {
      return null;
    }
  }

  private async gpResolveCdnUrl(photoRef: string): Promise<string | null> {
    const apiUrl = `${GP_PHOTO_BASE}?maxwidth=800&photoreference=${encodeURIComponent(photoRef)}&key=${this.googlePlacesKey}`;
    try {
      const res = await fetch(apiUrl, { redirect: 'follow', signal: AbortSignal.timeout(7000) });
      if (res.ok && res.url && !res.url.includes('googleapis.com/maps/api/place/photo')) {
        return res.url; // lh3.googleusercontent.com/...
      }
      return null;
    } catch {
      return null;
    }
  }

  /** Proxy a Google Places photo reference through our server (avoids CORS / key exposure). */
  async proxyPhoto(photoRef: string, maxwidth: number): Promise<{ buffer: Buffer; contentType: string } | null> {
    if (!this.googlePlacesKey) return null;
    const url = `${GP_PHOTO_BASE}?maxwidth=${maxwidth}&photoreference=${encodeURIComponent(photoRef)}&key=${this.googlePlacesKey}`;
    try {
      const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type') ?? 'image/jpeg';
      const buffer = Buffer.from(await res.arrayBuffer());
      return { buffer, contentType };
    } catch {
      return null;
    }
  }

  private getFallbackImage(_context?: string): string {
    return FALLBACK_PLACEHOLDER_URL;
  }
}
