import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IImageProvider,
  ImageSource,
  PlaceImage,
  PlaceImageQuery,
} from '../interfaces/image-provider.interface';

const GP = 'https://maps.googleapis.com/maps/api/place';
const T_SEARCH = 6_000;
const T_PHOTO  = 8_000;
const DEFAULT_MAX = 5;

@Injectable()
export class GooglePlacesProvider implements IImageProvider {
  readonly providerName: ImageSource = 'google_places';
  readonly priority = 1;

  private readonly logger = new Logger(GooglePlacesProvider.name);
  private readonly apiKey: string | null;
  /** In-process: photo_reference → resolved CDN URL */
  private readonly cdnCache = new Map<string, string>();
  private readonly CDN_MAX = 3_000;

  constructor(config: ConfigService) {
    const k = config.get<string>('GOOGLE_PLACES_KEY')?.trim();
    this.apiKey = k?.length ? k : null;
    if (this.apiKey) {
      this.logger.log(`Google Places provider initialized (key: ...${this.apiKey.slice(-6)})`);
    } else {
      this.logger.warn('GOOGLE_PLACES_KEY not set — Google Places provider disabled');
    }
  }

  isEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  async getImages(query: PlaceImageQuery): Promise<PlaceImage[]> {
    if (!this.apiKey) return [];

    const placeId = await this.resolvePlaceId(query);
    if (!placeId) return [];

    const refs = await this.fetchPhotoRefs(placeId, query.maxImages ?? DEFAULT_MAX);
    if (!refs.length) {
      this.logger.debug(`Google Places: place found (${placeId}) but 0 photos for "${query.name}"`);
      return [];
    }

    const settled = await Promise.allSettled(refs.map(r => this.resolveCdnUrl(r)));

    const images: PlaceImage[] = [];
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) {
        images.push({ url: r.value, source: 'google_places', isGeneric: false });
      }
    }

    this.logger.log(
      `Google Places: ${images.length}/${refs.length} photos resolved for "${query.name}"`,
    );
    return images;
  }

  // ── Place ID resolution ────────────────────────────────────────────────────

  private async resolvePlaceId(query: PlaceImageQuery): Promise<string | null> {
    const hasCoords =
      query.lat != null && query.lng != null &&
      Number.isFinite(query.lat) && Number.isFinite(query.lng);

    if (hasCoords) {
      const id = await this.nearbySearch(query.lat!, query.lng!, query.name);
      if (id) return id;
    }

    const withCity = [query.name, query.city].filter(Boolean).join(' ');
    const nameOnly = query.name;

    const id1 = await this.findPlaceFromText(withCity);
    if (id1) return id1;

    const id2 = await this.textSearch(withCity);
    if (id2) return id2;

    if (!query.city) return null;

    const id3 = await this.findPlaceFromText(nameOnly);
    if (id3) return id3;

    return this.textSearch(nameOnly);
  }

  private async nearbySearch(lat: number, lng: number, name: string, radius = 500): Promise<string | null> {
    try {
      const url = `${GP}/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${enc(name)}&key=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(T_SEARCH) });
      if (!res.ok) {
        this.logger.warn(`nearbysearch HTTP ${res.status} for "${name}"`);
        return null;
      }
      const data = (await res.json()) as { status?: string; results?: Array<{ place_id?: string }> };
      if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        this.logger.warn(`nearbysearch status "${data.status}" for "${name}" — check API key billing/permissions`);
      }
      if (data.status === 'ZERO_RESULTS' && radius < 1000) {
        return this.nearbySearch(lat, lng, name, 1000);
      }
      return data.results?.[0]?.place_id ?? null;
    } catch (err) {
      this.logger.debug(`nearbysearch error for "${name}": ${(err as Error).message}`);
      return null;
    }
  }

  private async findPlaceFromText(q: string): Promise<string | null> {
    try {
      const url = `${GP}/findplacefromtext/json?input=${enc(q)}&inputtype=textquery&fields=place_id&key=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(T_SEARCH) });
      if (!res.ok) {
        this.logger.warn(`findplacefromtext HTTP ${res.status} for "${q}"`);
        return null;
      }
      const data = (await res.json()) as { status?: string; candidates?: Array<{ place_id?: string }> };
      if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        this.logger.warn(`findplacefromtext status "${data.status}" for "${q}" — check API key`);
      }
      return data?.candidates?.[0]?.place_id ?? null;
    } catch (err) {
      this.logger.debug(`findplacefromtext error for "${q}": ${(err as Error).message}`);
      return null;
    }
  }

  private async textSearch(q: string): Promise<string | null> {
    try {
      const url = `${GP}/textsearch/json?query=${enc(q)}&key=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(T_SEARCH) });
      if (!res.ok) {
        this.logger.warn(`textsearch HTTP ${res.status} for "${q}"`);
        return null;
      }
      const data = (await res.json()) as { status?: string; results?: Array<{ place_id?: string }> };
      if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        this.logger.warn(`textsearch status "${data.status}" for "${q}" — check API key`);
      }
      return data?.results?.[0]?.place_id ?? null;
    } catch (err) {
      this.logger.debug(`textsearch error for "${q}": ${(err as Error).message}`);
      return null;
    }
  }

  private async fetchPhotoRefs(placeId: string, max: number): Promise<string[]> {
    try {
      const url = `${GP}/details/json?place_id=${placeId}&fields=photos&key=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(T_SEARCH) });
      if (!res.ok) return [];
      const data = (await res.json()) as { result?: { photos?: Array<{ photo_reference?: string }> } };
      return (data?.result?.photos ?? [])
        .slice(0, max)
        .map(p => p.photo_reference)
        .filter((r): r is string => Boolean(r));
    } catch {
      return [];
    }
  }

  private async resolveCdnUrl(ref: string): Promise<string | null> {
    if (this.cdnCache.has(ref)) return this.cdnCache.get(ref)!;

    const apiUrl = `${GP}/photo?maxwidth=1200&photoreference=${enc(ref)}&key=${this.apiKey}`;
    try {
      const res = await fetch(apiUrl, { redirect: 'follow', signal: AbortSignal.timeout(T_PHOTO) });
      if (res.ok && res.url && !res.url.includes('googleapis.com/maps/api/place/photo')) {
        if (this.cdnCache.size >= this.CDN_MAX) {
          this.cdnCache.delete(this.cdnCache.keys().next().value!);
        }
        this.cdnCache.set(ref, res.url);
        return res.url;
      }
      return null;
    } catch {
      return null;
    }
  }
}

const enc = encodeURIComponent;
