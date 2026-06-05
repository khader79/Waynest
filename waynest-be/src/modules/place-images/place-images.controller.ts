import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { PlaceImageService } from './place-image.service';
import { PlaceGallery } from './interfaces/image-provider.interface';

@Controller('place-images')
export class PlaceImagesController {
  private readonly googleApiKey: string | null;
  /** In-process map: photo_reference → resolved CDN URL */
  private readonly proxyCache = new Map<string, string>();
  private readonly PROXY_CACHE_MAX = 5_000;

  constructor(
    private readonly imageService: PlaceImageService,
    private readonly config: ConfigService,
  ) {
    const k = this.config.get<string>('GOOGLE_PLACES_KEY')?.trim();
    this.googleApiKey = k?.length ? k : null;
  }

  // ── Gallery endpoint ───────────────────────────────────────────────────────

  /**
   * GET /place-images?name=xxx&city=xxx&type=xxx&maxImages=5
   * Returns a gallery of real images for any named place.
   */
  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async getGallery(
    @Query('name') name: string,
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('type') type?: string,
    @Query('maxImages') maxImagesStr?: string,
    @Query('lat') latStr?: string,
    @Query('lng') lngStr?: string,
  ): Promise<PlaceGallery> {
    if (!name?.trim()) {
      throw new BadRequestException('name is required');
    }

    const maxImages = Math.min(Math.max(Number(maxImagesStr) || 5, 1), 10);
    const lat = latStr ? Number(latStr) : undefined;
    const lng = lngStr ? Number(lngStr) : undefined;

    return this.imageService.getGallery({
      name: name.trim(),
      city: city?.trim(),
      country: country?.trim(),
      type: type?.trim(),
      maxImages,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
    });
  }

  // ── Cache invalidation (for testing / fixing bad cached misses) ───────────

  /**
   * DELETE /place-images/cache?name=xxx&city=xxx
   * Clears the Redis cache for a specific place so it re-fetches.
   */
  @Get('cache/clear')
  async clearCache(
    @Query('name') name: string,
    @Query('city') city?: string,
  ) {
    if (!name?.trim()) {
      throw new BadRequestException('name is required');
    }
    await this.imageService.cache.invalidate(name.trim(), city?.trim());
    return { message: `Cache cleared for "${name.trim()}"` };
  }

  /**
   * GET /place-images/cache/flush
   * Deletes ALL cached image entries so every place re-fetches on next request.
   * Use this after fixing providers or validators.
   */
  @Get('cache/flush')
  async flushCache() {
    const deleted = await this.imageService.cache.flushAll();
    return { message: `Cache flushed — ${deleted} entries deleted. Images will re-fetch on next request.` };
  }

  // ── Google API key diagnostic ──────────────────────────────────────────────

  /**
   * GET /place-images/debug-key
   * Tests the Google Places API key with a known place ("Eiffel Tower").
   * Use this to diagnose REQUEST_DENIED or billing issues.
   */
  @Get('debug-key')
  async debugApiKey() {
    const key = this.config.get<string>('GOOGLE_PLACES_KEY')?.trim();
    if (!key) return { status: 'NO_KEY', message: 'GOOGLE_PLACES_KEY is not set' };

    const testUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Eiffel+Tower+Paris&inputtype=textquery&fields=place_id&key=${key}`;
    try {
      const res = await fetch(testUrl, { signal: AbortSignal.timeout(6000) });
      const body = (await res.json()) as Record<string, unknown>;
      return {
        httpStatus: res.status,
        apiStatus: body.status,
        candidatesFound: Array.isArray(body.candidates) ? body.candidates.length : 0,
        diagnosis: (() => {
          if (body.status === 'OK') return '✅ Key works. Places API is enabled and billing is active.';
          if (body.status === 'REQUEST_DENIED') return '❌ REQUEST_DENIED — Either billing is not enabled on this Google Cloud project, or the Places API is not enabled, or the key has HTTP referrer restrictions blocking server-side calls.';
          if (body.status === 'OVER_QUERY_LIMIT') return '⚠️ OVER_QUERY_LIMIT — Daily quota exceeded.';
          if (body.status === 'INVALID_REQUEST') return '❌ INVALID_REQUEST — Check the API key format.';
          return `Unknown status: ${body.status}`;
        })(),
      };
    } catch (err) {
      return { status: 'FETCH_ERROR', message: (err as Error).message };
    }
  }

  // ── Google Places photo proxy ──────────────────────────────────────────────

  /**
   * GET /place-images/photo?ref=<photo_reference>&w=800
   * Resolves a Google Places photo reference → redirects to CDN URL.
   * API key is NEVER exposed to the client.
   * Cache-Control: 24h on client side.
   */
  @Get('photo')
  @Throttle({ default: { limit: 500, ttl: 60_000 } })
  async proxyGooglePhoto(
    @Query('ref') ref: string,
    @Query('w') wStr?: string,
    @Res() res?: Response,
  ) {
    if (!ref?.trim() || ref.length > 3000) {
      return res!.status(400).json({ message: 'Invalid photo reference' });
    }

    if (!this.googleApiKey) {
      return res!.status(503).json({ message: 'Google Places not configured' });
    }

    const maxwidth = Math.min(Math.max(Number(wStr) || 800, 100), 1600);

    // Check in-process cache first
    const cached = this.proxyCache.get(ref);
    if (cached) {
      res!.setHeader('Cache-Control', 'public, max-age=86400');
      res!.setHeader('X-Image-Cache', 'HIT');
      return res!.redirect(302, cached);
    }

    // Follow Google's redirect server-side
    const apiUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photoreference=${encodeURIComponent(ref)}&key=${this.googleApiKey}`;

    try {
      const photoRes = await fetch(apiUrl, {
        redirect: 'follow',
        signal: AbortSignal.timeout(8_000),
      });

      if (
        photoRes.ok &&
        photoRes.url &&
        !photoRes.url.includes('googleapis.com/maps/api/place/photo')
      ) {
        // Store CDN URL in process cache
        if (this.proxyCache.size >= this.PROXY_CACHE_MAX) {
          this.proxyCache.delete(this.proxyCache.keys().next().value!);
        }
        this.proxyCache.set(ref, photoRes.url);

        res!.setHeader('Cache-Control', 'public, max-age=86400');
        res!.setHeader('X-Image-Cache', 'MISS');
        return res!.redirect(302, photoRes.url);
      }

      return res!.status(404).end();
    } catch {
      return res!.status(504).end();
    }
  }
}
