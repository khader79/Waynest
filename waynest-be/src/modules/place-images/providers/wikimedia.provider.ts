import { Injectable, Logger } from '@nestjs/common';
import {
  IImageProvider,
  ImageSource,
  PlaceImage,
  PlaceImageQuery,
} from '../interfaces/image-provider.interface';

const WM_API = 'https://commons.wikimedia.org/w/api.php';
const T = 6_000;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface WmImageInfo {
  url?: string;
  thumburl?: string;
  thumbwidth?: number;
  thumbheight?: number;
  width?: number;
  height?: number;
  mime?: string;
}

@Injectable()
export class WikimediaProvider implements IImageProvider {
  readonly providerName: ImageSource = 'wikimedia';
  readonly priority = 3;

  private readonly logger = new Logger(WikimediaProvider.name);

  isEnabled(): boolean {
    return true; // public API, no key required
  }

  async getImages(query: PlaceImageQuery): Promise<PlaceImage[]> {
    // Don't search Wikimedia for generic/test names — results would be random
    if (query.name.trim().length < 5 || /^test/i.test(query.name.trim())) {
      return [];
    }

    const q = [query.name, query.city].filter(Boolean).join(' ');
    const images = await this.searchCommons(q, query.maxImages ?? 5);

    if (!images.length && query.city) {
      return this.searchCommons(query.name, query.maxImages ?? 5);
    }

    this.logger.debug(
      `Wikimedia: ${images.length} images for "${query.name}"`,
    );
    return images;
  }

  private async searchCommons(
    query: string,
    limit: number,
  ): Promise<PlaceImage[]> {
    try {
      // Remove parentheses and special chars that break Wikimedia search
      const cleanedQuery = query.replace(/[()]/g, '').replace(/\s+/g, ' ').trim();

      const params = new URLSearchParams({
        action: 'query',
        generator: 'search',
        gsrsearch: cleanedQuery,   // no filetype:bitmap — it limits results too much
        gsrnamespace: '6',         // File: namespace only
        gsrlimit: String(Math.min(limit * 3, 15)), // fetch more to filter
        prop: 'imageinfo',
        iiprop: 'url|dimensions|mime',
        iiurlwidth: '1200',        // request larger thumbnails
        format: 'json',
      });

      const res = await fetch(`${WM_API}?${params}`, {
        signal: AbortSignal.timeout(T),
        headers: { 'User-Agent': 'Waynest/1.0 (travel-planner)' },
      });
      if (!res.ok) return [];

      const data = (await res.json()) as {
        query?: { pages?: Record<string, { imageinfo?: WmImageInfo[] }> };
      };
      const pages = Object.values(data?.query?.pages ?? {});

      return pages
        .flatMap((p) => p.imageinfo ?? [])
        .filter(
          (ii) =>
            ii.mime && ALLOWED_MIME.has(ii.mime) &&
            (ii.thumburl || ii.url) &&
            (ii.thumbwidth ?? ii.width ?? 0) >= 200, // relaxed — was 400
        )
        .slice(0, limit)
        .map((ii) => ({
          url: ii.thumburl ?? ii.url!,
          source: 'wikimedia' as ImageSource,
          width:  ii.thumbwidth  ?? ii.width,
          height: ii.thumbheight ?? ii.height,
          isGeneric: false,
          attribution: 'Wikimedia Commons (CC)',
        }));
    } catch {
      return [];
    }
  }
}
