import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Place } from 'src/modules/place/entities/place.entity';
import { Repository } from 'typeorm';

type PlaceImageSubject = Pick<Place, 'id' | 'name' | 'imageUrl'> & {
  city?: {
    name?: string | null;
  } | null;
};

type GooglePlaceSearchResponse = {
  candidates?: Array<{
    place_id?: string;
  }>;
};

type GooglePlaceDetailsResponse = {
  result?: {
    photos?: Array<{
      photo_reference?: string;
    }>;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toSearchResponse = (value: unknown): GooglePlaceSearchResponse => {
  if (!isRecord(value) || !Array.isArray(value.candidates)) {
    return {};
  }

  return {
    candidates: value.candidates.filter(isRecord).map((candidate) => ({
      place_id:
        typeof candidate.place_id === 'string' ? candidate.place_id : undefined,
    })),
  };
};

const toDetailsResponse = (value: unknown): GooglePlaceDetailsResponse => {
  if (!isRecord(value) || !isRecord(value.result)) {
    return {};
  }

  const photos = Array.isArray(value.result.photos)
    ? value.result.photos.filter(isRecord).map((photo) => ({
        photo_reference:
          typeof photo.photo_reference === 'string'
            ? photo.photo_reference
            : undefined,
      }))
    : undefined;

  return {
    result: {
      photos,
    },
  };
};

@Injectable()
export class ImageFetcherService {
  private readonly logger = new Logger(ImageFetcherService.name);
  private readonly apiKey: string | null;
  private readonly inFlightByPlaceId = new Map<
    string,
    Promise<string | null>
  >();
  private readonly recentMissByPlaceId = new Map<string, number>();
  private readonly recentMissTtlMs = 30 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Place)
    private placeRepo: Repository<Place>,
  ) {
    const apiKey = this.configService.get<string>('GOOGLE_PLACES_KEY')?.trim();
    this.apiKey = apiKey && apiKey.length > 0 ? apiKey : null;

    if (!this.apiKey) {
      this.logger.warn(
        'GOOGLE_PLACES_KEY is not set. Place image web fallback is disabled.',
      );
    }
  }

  private markRecentMiss(placeId: string) {
    this.recentMissByPlaceId.set(placeId, Date.now());
  }

  private isRecentlyMissed(placeId: string): boolean {
    const ts = this.recentMissByPlaceId.get(placeId);
    if (!ts) {
      return false;
    }

    if (Date.now() - ts > this.recentMissTtlMs) {
      this.recentMissByPlaceId.delete(placeId);
      return false;
    }

    return true;
  }

  private buildSearchQuery(placeName: string, cityName?: string): string {
    const parts = [placeName.trim(), cityName?.trim()].filter(
      (part): part is string => Boolean(part && part.length > 0),
    );
    return parts.join(' ');
  }

  private async fetchAndPersistImage(
    placeId: string,
    placeName: string,
    cityName?: string,
  ): Promise<string | null> {
    if (!this.apiKey) {
      return null;
    }

    const latest = await this.placeRepo.findOne({
      where: { id: placeId },
      select: ['id', 'imageUrl'],
    });
    if (latest?.imageUrl?.trim()) {
      this.recentMissByPlaceId.delete(placeId);
      return latest.imageUrl.trim();
    }

    const query = this.buildSearchQuery(placeName, cityName);
    if (!query) {
      this.markRecentMiss(placeId);
      return null;
    }

    try {
      const searchRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id&key=${this.apiKey}`,
      );

      if (!searchRes.ok) {
        this.logger.warn(
          `findplacefromtext failed (${searchRes.status}) for "${query}"`,
        );
        this.markRecentMiss(placeId);
        return null;
      }

      const searchData = toSearchResponse(await searchRes.json());
      const googlePlaceId = searchData.candidates?.[0]?.place_id;
      if (!googlePlaceId) {
        this.markRecentMiss(placeId);
        return null;
      }

      const detailRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&fields=photos&key=${this.apiKey}`,
      );

      if (!detailRes.ok) {
        this.logger.warn(
          `place/details failed (${detailRes.status}) for "${query}"`,
        );
        this.markRecentMiss(placeId);
        return null;
      }

      const detailData = toDetailsResponse(await detailRes.json());
      const photoRef = detailData.result?.photos?.[0]?.photo_reference;
      if (!photoRef) {
        this.markRecentMiss(placeId);
        return null;
      }

      const imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${this.apiKey}`;
      await this.placeRepo.update(placeId, { imageUrl });
      this.recentMissByPlaceId.delete(placeId);
      return imageUrl;
    } catch (err) {
      this.markRecentMiss(placeId);
      this.logger.warn(`[image] failed for ${placeName}`, err as Error);
      return null;
    }
  }

  async ensureImage(place: PlaceImageSubject): Promise<string | null> {
    if (place.imageUrl?.trim()) {
      return place.imageUrl.trim();
    }

    if (!this.apiKey) {
      return null;
    }

    const placeId = place.id;
    const placeName = place.name?.trim();
    if (!placeId || !placeName) {
      return null;
    }

    if (this.isRecentlyMissed(placeId)) {
      return null;
    }

    const inFlight = this.inFlightByPlaceId.get(placeId);
    if (inFlight) {
      return inFlight;
    }

    const cityName =
      typeof place.city?.name === 'string' ? place.city.name : undefined;

    const task = this.fetchAndPersistImage(placeId, placeName, cityName)
      .catch(() => null)
      .finally(() => {
        this.inFlightByPlaceId.delete(placeId);
      });

    this.inFlightByPlaceId.set(placeId, task);
    return task;
  }
}
