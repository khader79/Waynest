import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IImageProvider,
  ImageSource,
  PlaceImage,
  PlaceImageQuery,
} from '../interfaces/image-provider.interface';

const UNSPLASH_BASE = 'https://api.unsplash.com/search/photos';
const T = 5_000;

interface UnsplashPhoto {
  urls: { regular: string; small: string };
  width: number;
  height: number;
  alt_description: string | null;
  user?: { name?: string };
}

@Injectable()
export class UnsplashProvider implements IImageProvider {
  readonly providerName: ImageSource = 'unsplash';
  readonly priority = 6;

  private readonly logger = new Logger(UnsplashProvider.name);
  private readonly accessKey: string | null;

  constructor(config: ConfigService) {
    const k = config.get<string>('UNSPLASH_ACCESS_KEY')?.trim();
    this.accessKey = k?.length ? k : null;
  }

  isEnabled(): boolean {
    return Boolean(this.accessKey);
  }

  async getImages(query: PlaceImageQuery): Promise<PlaceImage[]> {
    if (!this.accessKey) return [];

    const q = [query.name, query.city].filter(Boolean).join(' ') + ' landmark travel';
    const images = await this.search(q, query.maxImages ?? 5);

    // If specific place search returned nothing, try city only
    if (!images.length && query.city) {
      const cityImages = await this.search(
        `${query.city} travel destination`,
        query.maxImages ?? 3,
      );
      return cityImages.map((img) => ({ ...img, isGeneric: true }));
    }

    this.logger.debug(`Unsplash: ${images.length} photos for "${query.name}"`);
    return images;
  }

  private async search(
    query: string,
    perPage: number,
  ): Promise<PlaceImage[]> {
    try {
      const params = new URLSearchParams({
        query,
        per_page: String(perPage),
        orientation: 'landscape',
        content_filter: 'high',
      });
      const res = await fetch(`${UNSPLASH_BASE}?${params}`, {
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
          'Accept-Version': 'v1',
        },
        signal: AbortSignal.timeout(T),
      });

      if (!res.ok) {
        if (res.status === 403 || res.status === 429) {
          this.logger.warn(`Unsplash rate-limited (${res.status})`);
        }
        return [];
      }

      const data = (await res.json()) as { results?: UnsplashPhoto[] };
      return (data?.results ?? []).map((p) => ({
        url: `${p.urls.regular}&auto=format&fit=crop&w=800&q=75`,
        source: 'unsplash' as ImageSource,
        width: 800,
        isGeneric: false,
        attribution: p.user?.name ? `Photo by ${p.user.name} on Unsplash` : 'Unsplash',
      }));
    } catch {
      return [];
    }
  }
}
