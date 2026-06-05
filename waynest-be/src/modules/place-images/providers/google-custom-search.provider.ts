import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IImageProvider,
  ImageSource,
  PlaceImage,
  PlaceImageQuery,
} from '../interfaces/image-provider.interface';

const CSE_BASE = 'https://www.googleapis.com/customsearch/v1';
const T = 6_000;

interface CseImageItem {
  link?: string;
  image?: {
    width?: number;
    height?: number;
    thumbnailLink?: string;
    thumbnailWidth?: number;
    thumbnailHeight?: number;
  };
  mime?: string;
}

interface CseResponse {
  items?: CseImageItem[];
  error?: { message?: string; status?: string };
}

@Injectable()
export class GoogleCustomSearchProvider implements IImageProvider {
  readonly providerName: ImageSource = 'google_custom_search';
  readonly priority = 4;

  private readonly logger = new Logger(GoogleCustomSearchProvider.name);
  private readonly apiKey: string | null;
  private readonly cseId: string | null;

  constructor(config: ConfigService) {
    const k = config.get<string>('GOOGLE_CUSTOM_SEARCH_KEY')?.trim();
    const c = config.get<string>('GOOGLE_CSE_ID')?.trim();
    this.apiKey = k?.length ? k : null;
    this.cseId  = c?.length ? c : null;

    if (!this.apiKey || !this.cseId) {
      this.logger.warn(
        'GOOGLE_CUSTOM_SEARCH_KEY or GOOGLE_CSE_ID not set — Google Custom Search provider disabled.',
      );
    }
  }

  isEnabled(): boolean {
    return Boolean(this.apiKey && this.cseId);
  }

  async getImages(query: PlaceImageQuery): Promise<PlaceImage[]> {
    if (!this.isEnabled()) return [];

    const q = this.buildQuery(query);
    const images = await this.search(q, query.maxImages ?? 5);

    this.logger.debug(`Google Custom Search: ${images.length} results for "${query.name}"`);
    return images;
  }

  private buildQuery(query: PlaceImageQuery): string {
    const parts = [query.name];
    if (query.city) parts.push(query.city);

    // Add context for better travel images
    const typeHints: Record<string, string> = {
      RESTAURANT: 'restaurant food',
      CAFE: 'cafe coffee',
      MUSEUM: 'museum interior',
      PARK: 'park nature',
      BEACH: 'beach sea',
      HOTEL: 'hotel',
      LANDMARK: 'landmark',
      CHURCH: 'church',
      MOSQUE: 'mosque',
    };
    const hint = query.type ? (typeHints[query.type.toUpperCase()] ?? 'place') : 'landmark travel';
    parts.push(hint);

    return parts.join(' ');
  }

  private async search(q: string, max: number): Promise<PlaceImage[]> {
    try {
      const params = new URLSearchParams({
        q,
        cx:          this.cseId!,
        key:         this.apiKey!,
        searchType:  'image',
        imgType:     'photo',
        imgSize:     'large',     // prefer large images
        imgColorType: 'color',
        safe:        'active',
        num:         String(Math.min(max * 2, 10)), // request extra to filter
      });

      const res = await fetch(`${CSE_BASE}?${params}`, {
        signal: AbortSignal.timeout(T),
      });

      if (!res.ok) {
        this.logger.warn(`Google Custom Search HTTP ${res.status} for "${q}"`);
        return [];
      }

      const data = (await res.json()) as CseResponse;

      if (data.error) {
        this.logger.warn(`Google Custom Search API error for "${q}": ${data.error.message} (${data.error.status})`);
        return [];
      }

      return (data.items ?? [])
        .filter((item): item is Required<Pick<CseImageItem, 'link'>> & CseImageItem =>
          Boolean(item.link) && /^https?:\/\//i.test(item.link!),
        )
        .slice(0, max)
        .map(item => ({
          url:    item.link!,
          source: 'google_custom_search' as ImageSource,
          width:  item.image?.width,
          height: item.image?.height,
          isGeneric: false,
        }));
    } catch (err) {
      this.logger.debug(`Google Custom Search error for "${q}": ${(err as Error).message}`);
      return [];
    }
  }
}
