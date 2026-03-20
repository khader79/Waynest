import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Place } from 'src/modules/place/entities/place.entity';
import { Repository } from 'typeorm';

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
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Place)
    private placeRepo: Repository<Place>,
  ) {
    const apiKey = this.configService.get<string>('GOOGLE_PLACES_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_KEY is not set');
    }
    this.apiKey = apiKey;
  }

  async ensureImage(place: Place): Promise<string | null> {
    if (place.imageUrl) return place.imageUrl;

    try {
      const searchRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(place.name + ' Bethlehem')}&inputtype=textquery&fields=place_id&key=${this.apiKey}`,
      );
      const searchData = toSearchResponse(await searchRes.json());
      const placeId = searchData.candidates?.[0]?.place_id;
      if (!placeId) return null;

      const detailRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${this.apiKey}`,
      );
      const detailData = toDetailsResponse(await detailRes.json());
      const photoRef = detailData.result?.photos?.[0]?.photo_reference;
      if (!photoRef) return null;

      const imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${this.apiKey}`;
      await this.placeRepo.update(place.id, { imageUrl });
      console.log(`[image] saved: ${place.name}`);
      return imageUrl;
    } catch (err) {
      console.error(`[image] failed: ${place.name}`, err);
      return null;
    }
  }
}
