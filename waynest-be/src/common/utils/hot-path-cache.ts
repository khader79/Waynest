import { Logger } from '@nestjs/common';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class HotPathCache {
  private readonly logger = new Logger(HotPathCache.name);
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private redisClient: any = null;
  private isRedisHealthy = false;

  constructor(
    private readonly maxEntries = 500,
    redisClient?: any,
  ) {
    this.redisClient = redisClient || null;
    this.isRedisHealthy = redisClient !== null;
  }

  setRedisClient(client: any) {
    this.redisClient = client;
    this.isRedisHealthy = true;
  }

  private prune() {
    const now = Date.now();

    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }

    if (this.store.size <= this.maxEntries) {
      return;
    }

    const overflow = this.store.size - this.maxEntries;
    const keys = this.store.keys();
    for (let i = 0; i < overflow; i += 1) {
      const key = keys.next().value;
      if (!key) break;
      this.store.delete(key);
    }
  }

  private async getFromRedis<T>(key: string): Promise<T | null> {
    if (!this.isRedisHealthy || !this.redisClient) {
      return null;
    }

    try {
      const data = await this.redisClient.get(key);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as T;
    } catch (err) {
      this.logger.warn(`Redis get failed for key ${key}:`, err);
      this.isRedisHealthy = false;
      return null;
    }
  }

  private async setInRedis<T>(
    key: string,
    value: T,
    ttlMs: number,
  ): Promise<void> {
    if (!this.isRedisHealthy || !this.redisClient) {
      return;
    }

    try {
      const safeTtl = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 1;
      const ttlSeconds = Math.ceil(safeTtl / 1000);
      const serialized = JSON.stringify(value);
      await this.redisClient.setEx(key, ttlSeconds, serialized);
    } catch (err) {
      this.logger.warn(`Redis set failed for key ${key}:`, err);
      this.isRedisHealthy = false;
    }
  }

  private async deleteFromRedis(key: string): Promise<void> {
    if (!this.isRedisHealthy || !this.redisClient) {
      return;
    }

    try {
      await this.redisClient.del(key);
    } catch (err) {
      this.logger.warn(`Redis delete failed for key ${key}:`, err);
      this.isRedisHealthy = false;
    }
  }

  private async deleteFromRedisByPrefix(prefix: string): Promise<void> {
    if (!this.isRedisHealthy || !this.redisClient) {
      return;
    }

    try {
      const keys = await this.redisClient.keys(`${prefix}*`);
      if (keys.length > 0) {
        for (const key of keys) {
          await this.redisClient.del(key);
        }
      }
    } catch (err) {
      this.logger.warn(`Redis prefix delete failed for ${prefix}:`, err);
      this.isRedisHealthy = false;
    }
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs: number): T {
    const safeTtl = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 1;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + safeTtl,
    });
    this.prune();

    this.setInRedis(key, value, ttlMs).catch(() => {});

    return value;
  }

  delete(key: string) {
    this.store.delete(key);
    this.deleteFromRedis(key).catch(() => {});
  }

  deleteByPrefix(prefix: string) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
    this.deleteFromRedisByPrefix(prefix).catch(() => {});
  }

  clear() {
    this.store.clear();
    this.inFlight.clear();
  }

  async getOrSet<T>(
    key: string,
    ttlMs: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const pending = this.inFlight.get(key) as Promise<T> | undefined;
    if (pending) {
      return pending;
    }

    if (this.isRedisHealthy && this.redisClient) {
      try {
        const redisValue = await this.getFromRedis<T>(key);
        if (redisValue !== null) {
          this.set(key, redisValue, ttlMs);
          return redisValue;
        }
      } catch (err) {
        this.logger.warn(`Redis getOrSet failed:`, err);
        this.isRedisHealthy = false;
      }
    }

    const task = (async () => {
      try {
        const value = await loader();
        this.set(key, value, ttlMs);
        return value;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, task as Promise<unknown>);
    return task;
  }
}
