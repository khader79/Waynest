type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class HotPathCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(private readonly maxEntries = 500) {}

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
    return value;
  }

  delete(key: string) {
    this.store.delete(key);
  }

  deleteByPrefix(prefix: string) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
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
