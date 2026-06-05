import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IImageProvider,
  PlaceGallery,
  PlaceImage,
  PlaceImageQuery,
  ProviderStat,
} from './interfaces/image-provider.interface';
import { PlaceImageCacheService } from './place-image-cache.service';
import { ImageValidatorUtil } from './utils/image-validator.util';

export const IMAGE_PROVIDERS = 'IMAGE_PROVIDERS';

// How many top-priority providers to run in parallel (rest are sequential fallback)
const PARALLEL_TIER_SIZE = 2;
// Per-provider timeout wrapper (ms) — ensures a slow provider doesn't stall the chain
const PROVIDER_TIMEOUT_MS = 7_000;

@Injectable()
export class PlaceImageService {
  private readonly logger = new Logger(PlaceImageService.name);

  constructor(
    @Inject(IMAGE_PROVIDERS) private readonly providers: IImageProvider[],
    readonly cache: PlaceImageCacheService,
  ) {}

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Returns a full image gallery for a place.
   *
   * Strategy:
   *   Tier 1 (parallel): top PARALLEL_TIER_SIZE enabled providers run simultaneously.
   *   If tier 1 fails, tier 2 providers run sequentially until one succeeds.
   *
   * Results are cached in Redis for 7 days (misses for 1 hour).
   */
  async getGallery(query: PlaceImageQuery): Promise<PlaceGallery> {
    const t0 = Date.now();
    const cacheKey = this.cache.buildKey(query.name, query.city);

    // ── Cache hit ──────────────────────────────────────────────────────────
    const cached = await this.cache.get(cacheKey);
    if (cached !== null) {
      this.logger.log(
        `[CACHE HIT] "${query.name}" — ${cached.length} images (${Date.now() - t0}ms)`,
      );
      return this.buildGallery(query.name, cached, true);
    }

    const maxImages = query.maxImages ?? 5;
    const stats: ProviderStat[] = [];

    // ── Provider execution: parallel tier1, sequential fallback ───────────
    const { images: raw, stats: provStats } = await this.runProviders(query, stats);
    const images = ImageValidatorUtil.process(raw, maxImages);

    stats.push(...provStats);

    // ── Cache result ───────────────────────────────────────────────────────
    if (images.length > 0) {
      await this.cache.set(cacheKey, images);
      this.logger.log(
        `[CACHE SET] "${query.name}" — ${images.length} images via ${images[0].source} ` +
        `(total ${Date.now() - t0}ms)`,
      );
    } else {
      await this.cache.setMiss(cacheKey);
      this.logger.warn(
        `[NO IMAGES] "${query.name}" — tried ${stats.length} providers (${Date.now() - t0}ms)`,
      );
    }

    return this.buildGallery(query.name, images, false, stats);
  }

  /**
   * Convenience: resolve just the best single image URL.
   * Used by trip generation enrichment, map markers, etc.
   */
  async getPrimaryImage(name: string, city?: string, type?: string): Promise<string | null> {
    const gallery = await this.getGallery({ name, city, type, maxImages: 1 });
    return gallery.images[0]?.url ?? null;
  }

  // ── Provider execution engine ────────────────────────────────────────────

  private async runProviders(
    query: PlaceImageQuery,
    statsOut: ProviderStat[],
  ): Promise<{ images: PlaceImage[]; stats: ProviderStat[] }> {
    const enabled = this.providers.filter(p => p.isEnabled());
    if (!enabled.length) return { images: [], stats: [] };

    const stats: ProviderStat[] = [];

    // ── Tier 1: parallel (top N providers) ──────────────────────────────
    const tier1 = enabled.slice(0, PARALLEL_TIER_SIZE);
    const tier2 = enabled.slice(PARALLEL_TIER_SIZE);

    const tier1Results = await Promise.allSettled(
      tier1.map(p => this.callProvider(p, query, stats)),
    );

    // Collect tier1 results in priority order (first provider with images wins)
    for (let i = 0; i < tier1.length; i++) {
      const r = tier1Results[i];
      if (r.status === 'fulfilled' && r.value.length > 0) {
        return { images: r.value, stats };
      }
    }

    // ── Tier 2: sequential fallback ──────────────────────────────────────
    for (const provider of tier2) {
      const images = await this.callProvider(provider, query, stats);
      if (images.length > 0) {
        return { images, stats };
      }
    }

    return { images: [], stats };
  }

  private async callProvider(
    provider: IImageProvider,
    query: PlaceImageQuery,
    statsOut: ProviderStat[],
  ): Promise<PlaceImage[]> {
    const t0 = Date.now();
    try {
      // Wrap with a per-provider timeout so a slow provider can't stall the chain
      const result = await Promise.race([
        provider.getImages(query),
        new Promise<PlaceImage[]>((_, reject) =>
          setTimeout(() => reject(new Error('provider timeout')), PROVIDER_TIMEOUT_MS),
        ),
      ]);

      const stat: ProviderStat = {
        provider: provider.providerName,
        durationMs: Date.now() - t0,
        found: result.length,
      };
      statsOut.push(stat);

      if (result.length > 0) {
        this.logger.log(
          `[${provider.providerName.toUpperCase()}] ✓ ${result.length} images for "${query.name}" (${stat.durationMs}ms)`,
        );
      } else {
        this.logger.debug(
          `[${provider.providerName.toUpperCase()}] ✗ 0 images for "${query.name}" (${stat.durationMs}ms)`,
        );
      }

      return result;
    } catch (err) {
      const durationMs = Date.now() - t0;
      const error = (err as Error).message;
      statsOut.push({ provider: provider.providerName, durationMs, found: 0, error });
      this.logger.warn(
        `[${provider.providerName.toUpperCase()}] ✗ Error for "${query.name}": ${error} (${durationMs}ms)`,
      );
      return [];
    }
  }

  private buildGallery(
    placeName: string,
    images: PlaceImage[],
    fromCache: boolean,
    stats?: ProviderStat[],
  ): PlaceGallery {
    return {
      placeName,
      topSource: images[0]?.source ?? null,
      images,
      fetchedAt: new Date().toISOString(),
      fromCache,
      stats,
    };
  }
}
