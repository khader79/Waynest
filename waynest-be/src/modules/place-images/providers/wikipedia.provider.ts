import { Injectable, Logger } from '@nestjs/common';
import {
  IImageProvider,
  ImageSource,
  PlaceImage,
  PlaceImageQuery,
} from '../interfaces/image-provider.interface';

const WP_API  = 'https://en.wikipedia.org/w/api.php';
const WP_REST = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const T = 6_000;

/** Remove parenthetical suffixes and clean special chars for better search. */
function cleanQuery(s: string): string {
  return s
    .replace(/\([^)]*\)/g, '') // remove (Jabal al-Fureidis), (Mar Nicola) etc.
    .replace(/['"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class WikipediaProvider implements IImageProvider {
  readonly providerName: ImageSource = 'wikipedia';
  readonly priority = 2;
  private readonly logger = new Logger(WikipediaProvider.name);

  isEnabled(): boolean { return true; }

  async getImages(query: PlaceImageQuery): Promise<PlaceImage[]> {
    // Try multiple query strategies to maximise hit rate
    const queries = this.buildQueries(query);

    for (const q of queries) {
      const title = await this.searchTitle(q);
      if (!title) continue;

      if (!this.titleIsRelevant(title, query.name)) {
        this.logger.debug(`Wikipedia: rejecting irrelevant page "${title}" for "${query.name}"`);
        continue;
      }

      const images = await this.getSummaryImages(title);
      if (images.length > 0) {
        this.logger.debug(`Wikipedia: ${images.length} images for "${query.name}" (page: "${title}")`);
        return images;
      }
    }
    return [];
  }

  /** Build search queries from most specific to least specific. */
  private buildQueries(query: PlaceImageQuery): string[] {
    const name    = query.name;
    const cleaned = cleanQuery(name);
    const city    = query.city;

    const qs: string[] = [];
    if (city) {
      qs.push(`${name} ${city}`);
      if (cleaned !== name) qs.push(`${cleaned} ${city}`);
    }
    qs.push(name);
    if (cleaned !== name) qs.push(cleaned);

    // Remove duplicates
    return [...new Set(qs)];
  }

  private async searchTitle(query: string): Promise<string | null> {
    try {
      const params = new URLSearchParams({
        action: 'query',
        list: 'search',
        srsearch: query,
        srlimit: '5',
        format: 'json',
      });
      const res = await fetch(`${WP_API}?${params}`, {
        signal: AbortSignal.timeout(T),
        headers: { 'User-Agent': 'Waynest/1.0 (travel-planner)' },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        query?: { search?: Array<{ title?: string }> };
      };

      // Return first result that isn't a disambiguation or list page
      const results = data?.query?.search ?? [];
      for (const r of results) {
        const t = r.title ?? '';
        if (t && !/disambiguation|list of/i.test(t)) return t;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Reject pages that are clearly about something else.
   * A page is relevant if at least one word from the place name appears in the title,
   * OR if the title shares a key root word (e.g. "Herodion" for "Herodium").
   */
  private titleIsRelevant(pageTitle: string, originalQuery: string): boolean {
    const title = pageTitle.toLowerCase();
    const query = originalQuery.toLowerCase();

    // Direct containment check (bidirectional)
    if (title.includes(query) || query.includes(title)) return true;

    // Word-level check — any word > 4 chars must appear in title
    const words = cleanQuery(query).split(/\s+/).filter(w => w.length > 4);
    if (words.some(w => title.includes(w))) return true;

    // Soft match: first word of either appears in the other
    const queryFirst = query.split(/\s+/)[0];
    const titleFirst = title.split(/\s+/)[0];
    if (queryFirst.length > 4 && (title.includes(queryFirst) || titleFirst.includes(queryFirst.slice(0, -2)))) {
      return true;
    }

    return false;
  }

  private async getSummaryImages(title: string): Promise<PlaceImage[]> {
    try {
      const res = await fetch(
        `${WP_REST}/${encodeURIComponent(title.replace(/ /g, '_'))}`,
        { signal: AbortSignal.timeout(T), headers: { 'User-Agent': 'Waynest/1.0 (travel-planner)' } },
      );
      if (!res.ok) return [];
      const data = (await res.json()) as {
        thumbnail?:     { source?: string; width?: number; height?: number };
        originalimage?: { source?: string; width?: number; height?: number };
      };

      const src = data?.originalimage?.source ?? data?.thumbnail?.source;
      if (!src || !isImageUrl(src)) return [];

      return [{
        url:   src,
        source: 'wikipedia',
        width:  data?.originalimage?.width  ?? data?.thumbnail?.width,
        height: data?.originalimage?.height ?? data?.thumbnail?.height,
        isGeneric: false,
        attribution: `Wikipedia — ${title}`,
      }];
    } catch {
      return [];
    }
  }
}

function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
}
