import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IImageProvider,
  ImageSource,
  PlaceImage,
  PlaceImageQuery,
} from '../interfaces/image-provider.interface';

const FSQ_BASE = 'https://api.foursquare.com/v3';
const T = 6_000;

interface FsqSearchResult {
  fsq_id?: string;
  name?: string;
}

interface FsqPhoto {
  id?: string;
  prefix?: string;
  suffix?: string;
  width?: number;
  height?: number;
  classifications?: string[];
}

@Injectable()
export class FoursquareProvider implements IImageProvider {
  readonly providerName: ImageSource = 'foursquare';
  readonly priority = 5;

  private readonly logger = new Logger(FoursquareProvider.name);
  private readonly apiKey: string | null;

  constructor(config: ConfigService) {
    const k = config.get<string>('FOURSQUARE_API_KEY')?.trim();
    this.apiKey = k?.length ? k : null;
  }

  isEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  async getImages(query: PlaceImageQuery): Promise<PlaceImage[]> {
    if (!this.apiKey) return [];

    const fsqId = await this.findVenueId(query);
    if (!fsqId) return [];

    const photos = await this.fetchPhotos(fsqId, query.maxImages ?? 5);

    this.logger.debug(
      `Foursquare: ${photos.length} photos for "${query.name}"`,
    );
    return photos;
  }

  private async findVenueId(query: PlaceImageQuery): Promise<string | null> {
    const params = new URLSearchParams({
      query: query.name,
      limit: '1',
      fields: 'fsq_id,name',
    });
    if (query.city) params.set('near', query.city);

    try {
      const res = await fetch(`${FSQ_BASE}/places/search?${params}`, {
        headers: { Authorization: this.apiKey! },
        signal: AbortSignal.timeout(T),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { results?: FsqSearchResult[] };
      return data?.results?.[0]?.fsq_id ?? null;
    } catch {
      return null;
    }
  }

  private async fetchPhotos(
    fsqId: string,
    max: number,
  ): Promise<PlaceImage[]> {
    try {
      const res = await fetch(
        `${FSQ_BASE}/places/${fsqId}/photos?limit=${max}&classifications=outdoor,indoor`,
        {
          headers: { Authorization: this.apiKey! },
          signal: AbortSignal.timeout(T),
        },
      );
      if (!res.ok) return [];
      const photos = (await res.json()) as FsqPhoto[];

      return photos
        .filter((p) => p.prefix && p.suffix)
        .map((p) => {
          const w = Math.min(p.width ?? 800, 1200);
          const h = Math.round((w / (p.width || 800)) * (p.height || 600));
          return {
            url: `${p.prefix!}${w}x${h}${p.suffix!}`,
            source: 'foursquare' as ImageSource,
            width: w,
            height: h,
            isGeneric: false,
          };
        });
    } catch {
      return [];
    }
  }
}
