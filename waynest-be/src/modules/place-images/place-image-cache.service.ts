import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { getRedisClient } from '../../common/utils/redis-client';
import { PlaceImage } from './interfaces/image-provider.interface';

const PREFIX   = 'place:gallery:v2:';
const TTL_HIT  = 7 * 86_400;   // 7 days  — place has images
const TTL_MISS = 24 * 3_600;   // 24 hours — no images found, stable for a full day
const MISS_SENTINEL = '__MISS__';

@Injectable()
export class PlaceImageCacheService {
  private readonly logger = new Logger(PlaceImageCacheService.name);

  buildKey(name: string, city?: string): string {
    const raw = `${name.toLowerCase().trim()}:${(city ?? '').toLowerCase().trim()}`;
    return PREFIX + createHash('sha256').update(raw).digest('hex');
  }

  /** Returns: images array if hit, null if miss (not cached), [] if cached-empty (MISS sentinel). */
  async get(key: string): Promise<PlaceImage[] | null> {
    const redis = getRedisClient();
    if (!redis) return null;

    try {
      const raw = await redis.get(key);
      if (raw === null) return null;
      if (raw === MISS_SENTINEL) return [];
      return JSON.parse(raw) as PlaceImage[];
    } catch (err) {
      this.logger.warn(`Cache read error: ${(err as Error).message}`);
      return null;
    }
  }

  async set(key: string, images: PlaceImage[]): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    try {
      await redis.setEx(key, TTL_HIT, JSON.stringify(images));
    } catch (err) {
      this.logger.warn(`Cache write error: ${(err as Error).message}`);
    }
  }

  async setMiss(key: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    try {
      await redis.setEx(key, TTL_MISS, MISS_SENTINEL);
    } catch (err) {
      this.logger.warn(`Cache miss write error: ${(err as Error).message}`);
    }
  }

  async invalidate(name: string, city?: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;
    try {
      await redis.del(this.buildKey(name, city));
    } catch { /* ignore */ }
  }

  /** Delete every cached entry (hits + misses) so all places re-fetch on next request. */
  async flushAll(): Promise<number> {
    const redis = getRedisClient();
    if (!redis) return 0;

    try {
      const keys = await redis.keys(`${PREFIX}*`);
      if (!keys.length) return 0;
      await redis.del(keys);
      this.logger.log(`Cache flushed: ${keys.length} entries deleted`);
      return keys.length;
    } catch (err) {
      this.logger.warn(`Cache flush error: ${(err as Error).message}`);
      return 0;
    }
  }
}
