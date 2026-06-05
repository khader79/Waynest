import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Place } from 'src/modules/place/entities/place.entity';
import { Repository } from 'typeorm';

type PlaceImageSubject = Pick<Place, 'id' | 'name' | 'imageUrl'> & {
  city?: { name?: string | null } | null;
};

interface GeoResult {
  placeId:   string;
  lat:       number | null;
  lng:       number | null;
}

const isString  = (v: unknown): v is string => typeof v === 'string';
const GP_BASE   = 'https://maps.googleapis.com/maps/api/place';
const T_SEARCH  = 5_000;
const T_PHOTO   = 7_000;

@Injectable()
export class ImageFetcherService {
  private readonly logger = new Logger(ImageFetcherService.name);
  private readonly apiKey: string | null;
  private readonly inFlightByPlaceId = new Map<string, Promise<string | null>>();
  private readonly recentMissByPlaceId = new Map<string, number>();
  private readonly recentMissTtlMs = 30 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Place) private readonly placeRepo: Repository<Place>,
  ) {
    const key = this.configService.get<string>('GOOGLE_PLACES_KEY')?.trim();
    this.apiKey = key?.length ? key : null;
    if (!this.apiKey) {
      this.logger.warn('GOOGLE_PLACES_KEY not set — place image fetching disabled.');
    }
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  clearMissCache(): void {
    this.recentMissByPlaceId.clear();
    this.logger.log('Miss cache cleared.');
  }

  /**
   * Fetch accurate coordinates from Google Places for a single place
   * and persist them to the DB. Returns the resolved coords or null.
   */
  async enrichCoordinates(place: {
    id: string;
    name: string;
    city?: { name?: string | null } | null;
  }): Promise<{ lat: number; lng: number } | null> {
    if (!this.apiKey) return null;

    const placeName = place.name?.trim();
    const cityName  = isString(place.city?.name) ? place.city!.name!.trim() : undefined;
    if (!placeName) return null;

    const geo = await this.findGooglePlace(placeName, cityName);
    if (!geo || geo.lat == null || geo.lng == null) return null;

    // Update BOTH text columns AND PostGIS geometry column in one raw query
    try {
      await this.placeRepo.query(
        `UPDATE places
         SET latitude  = $1,
             longitude = $2,
             "location" = ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)
         WHERE id = $3`,
        [geo.lat, geo.lng, place.id],
      );
    } catch {
      // PostGIS column might not exist — fall back to text columns only
      await this.placeRepo.query(
        `UPDATE places SET latitude = $1, longitude = $2 WHERE id = $3`,
        [geo.lat, geo.lng, place.id],
      );
    }

    this.logger.log(
      `[coords] "${placeName}" → (${geo.lat}, ${geo.lng})`,
    );

    return { lat: geo.lat, lng: geo.lng };
  }

  /** True if the stored URL is the old googleapis.com format. */
  isLegacyGoogleUrl(url: string | null | undefined): boolean {
    return Boolean(url?.includes('googleapis.com/maps/api/place/photo'));
  }

  async ensureImage(place: PlaceImageSubject): Promise<string | null> {
    const existing = place.imageUrl?.trim() ?? null;
    if (existing && !this.isLegacyGoogleUrl(existing)) return existing;
    if (!this.apiKey) return null;

    const placeId   = place.id;
    const placeName = place.name?.trim();
    if (!placeId || !placeName) return null;

    if (this.isRecentlyMissed(placeId)) return null;

    const inflight = this.inFlightByPlaceId.get(placeId);
    if (inflight) return inflight;

    const cityName = isString(place.city?.name) ? place.city!.name!.trim() : undefined;

    const task = this.fetchAndPersistImage(placeId, placeName, cityName)
      .catch(() => null)
      .finally(() => this.inFlightByPlaceId.delete(placeId));

    this.inFlightByPlaceId.set(placeId, task);
    return task;
  }

  // ── Core fetch ──────────────────────────────────────────────────────────────

  private async fetchAndPersistImage(
    placeId: string,
    placeName: string,
    cityName?: string,
  ): Promise<string | null> {
    const row = await this.placeRepo.findOne({
      where: { id: placeId },
      select: ['id', 'imageUrl', 'latitude', 'longitude'],
    });

    const storedUrl = row?.imageUrl?.trim() ?? null;
    if (storedUrl && !this.isLegacyGoogleUrl(storedUrl)) {
      this.recentMissByPlaceId.delete(placeId);
      return storedUrl;
    }

    // ── Resolve Google place + details (coords + photos in one call) ─────────
    const geoResult = await this.findGooglePlace(placeName, cityName);

    if (!geoResult) {
      this.markRecentMiss(placeId);
      return null;
    }

    // photoRef comes directly from getPlaceDetails (no extra API call needed)
    const photoRef = (geoResult as any).photoRef as string | undefined ?? null;

    // ── Follow redirect → CDN URL ────────────────────────────────────────────
    let imageUrl: string | null = null;
    if (photoRef) {
      imageUrl = await this.resolveCdnUrl(photoRef);
    }

    // ── Persist image + accurate coordinates in one update ───────────────────
    const updates: Partial<{ imageUrl: string; latitude: number; longitude: number }> = {};

    if (imageUrl) {
      updates.imageUrl = imageUrl;
      this.recentMissByPlaceId.delete(placeId);
    } else {
      this.markRecentMiss(placeId);
    }

    // Save Google's authoritative coordinates even if no photo was found
    const hasStoredCoords =
      row?.latitude != null && Number.isFinite(Number(row.latitude)) &&
      row?.longitude != null && Number.isFinite(Number(row.longitude));

    if (!hasStoredCoords && geoResult.lat != null && geoResult.lng != null) {
      updates.latitude  = geoResult.lat;
      updates.longitude = geoResult.lng;
      this.logger.debug(
        `[coords] Updated "${placeName}" → (${geoResult.lat}, ${geoResult.lng})`,
      );
    }

    if (Object.keys(updates).length > 0) {
      await this.placeRepo.update(placeId, updates);
    }

    return imageUrl;
  }

  // ── Multi-strategy Google place resolver ────────────────────────────────────
  //
  //   0. nearbysearch(lat/lng)   — only if we already have DB coords
  //   1. findplacefromtext(name+city) → includes geometry
  //   2. textsearch(name+city)        → includes geometry
  //   3. findplacefromtext(name)
  //   4. textsearch(name)

  private async findGooglePlace(
    placeName: string,
    cityName?: string,
  ): Promise<GeoResult | null> {
    const withCity = [placeName, cityName].filter(Boolean).join(' ');

    return (
      (await this.findPlaceFromText(withCity)) ??
      (await this.textSearch(withCity)) ??
      (cityName ? (await this.findPlaceFromText(placeName)) : null) ??
      (cityName ? (await this.textSearch(placeName)) : null)
    );
  }

  // findplacefromtext → place_id (geometry fetched separately via /details)
  private async findPlaceFromText(q: string): Promise<GeoResult | null> {
    try {
      const url = `${GP_BASE}/findplacefromtext/json` +
        `?input=${enc(q)}&inputtype=textquery&fields=place_id&key=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(T_SEARCH) });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        status?: string;
        candidates?: Array<{ place_id?: string }>;
      };
      if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        this.logger.warn(`findplacefromtext status "${data.status}" for "${q}"`);
      }
      const placeId = data?.candidates?.[0]?.place_id;
      if (!placeId) return null;
      return this.getPlaceDetails(placeId);
    } catch {
      return null;
    }
  }

  // textsearch → place_id + geometry (geometry is in textsearch response by default)
  private async textSearch(q: string): Promise<GeoResult | null> {
    try {
      const url = `${GP_BASE}/textsearch/json?query=${enc(q)}&key=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(T_SEARCH) });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        status?: string;
        results?: Array<{
          place_id?: string;
          geometry?: { location?: { lat?: number; lng?: number } };
        }>;
      };
      if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        this.logger.warn(`textsearch status "${data.status}" for "${q}"`);
      }
      const r = data?.results?.[0];
      if (!r?.place_id) return null;
      // textsearch returns geometry directly
      return {
        placeId: r.place_id,
        lat:     r.geometry?.location?.lat ?? null,
        lng:     r.geometry?.location?.lng ?? null,
      };
    } catch {
      return null;
    }
  }

  // /place/details — get both geometry (exact coords) and photos
  private async getPlaceDetails(googlePlaceId: string): Promise<GeoResult & { photoRef?: string } | null> {
    try {
      const url = `${GP_BASE}/details/json?place_id=${googlePlaceId}&fields=geometry,photos&key=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(T_SEARCH) });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        result?: {
          geometry?: { location?: { lat?: number; lng?: number } };
          photos?: Array<{ photo_reference?: string }>;
        };
      };
      return {
        placeId:  googlePlaceId,
        lat:      data?.result?.geometry?.location?.lat ?? null,
        lng:      data?.result?.geometry?.location?.lng ?? null,
        photoRef: data?.result?.photos?.[0]?.photo_reference,
      };
    } catch {
      return null;
    }
  }

  // Get first photo_reference from place details (used separately)
  private async getPhotoRef(googlePlaceId: string): Promise<string | null> {
    const details = await this.getPlaceDetails(googlePlaceId);
    return (details as any)?.photoRef ?? null;
  }

  // Follow Google Photos redirect → CDN URL (never expose API key to clients)
  private async resolveCdnUrl(photoRef: string): Promise<string | null> {
    const apiUrl = `${GP_BASE}/photo?maxwidth=1200&photoreference=${enc(photoRef)}&key=${this.apiKey}`;
    try {
      const res = await fetch(apiUrl, { redirect: 'follow', signal: AbortSignal.timeout(T_PHOTO) });
      if (res.ok && res.url && !res.url.includes('googleapis.com/maps/api/place/photo')) {
        return res.url;
      }
      return null;
    } catch {
      return null;
    }
  }

  // ── Miss-cache ──────────────────────────────────────────────────────────────

  private markRecentMiss(placeId: string) {
    this.recentMissByPlaceId.set(placeId, Date.now());
  }

  private isRecentlyMissed(placeId: string): boolean {
    const ts = this.recentMissByPlaceId.get(placeId);
    if (!ts) return false;
    if (Date.now() - ts > this.recentMissTtlMs) {
      this.recentMissByPlaceId.delete(placeId);
      return false;
    }
    return true;
  }
}

const enc = encodeURIComponent;
