const nowMs = () => Date.now();

/**
 * @param {{ ttlMs: number; maxEntries: number }} options
 */
export const createRequestCache = ({ ttlMs, maxEntries }) => {
  const cache = new Map();
  const inFlight = new Map();

  const evictIfNeeded = () => {
    while (cache.size > maxEntries) {
      const firstKey = cache.keys().next().value;
      if (firstKey === undefined) {
        break;
      }
      cache.delete(firstKey);
    }
  };

  const readCached = (key) => {
    if (!cache.has(key)) {
      return { hit: false, value: undefined };
    }

    const entry = cache.get(key);
    if (!entry || entry.expiresAt <= nowMs()) {
      cache.delete(key);
      return { hit: false, value: undefined };
    }

    return { hit: true, value: entry.value };
  };

  const writeCached = (key, value) => {
    cache.set(key, {
      value,
      expiresAt: nowMs() + ttlMs,
    });
    evictIfNeeded();
  };

  const run = async (key, requestFactory, requestConfig = {}) => {
    const cached = readCached(key);
    if (cached.hit) {
      return cached.value;
    }

    const hasSignal = Boolean(requestConfig?.signal);

    if (!hasSignal && inFlight.has(key)) {
      return inFlight.get(key);
    }

    const requestPromise = (async () => {
      const value = await requestFactory();
      writeCached(key, value);
      return value;
    })();

    if (!hasSignal) {
      inFlight.set(key, requestPromise);
    }

    try {
      return await requestPromise;
    } finally {
      if (!hasSignal) {
        inFlight.delete(key);
      }
    }
  };

  return {
    run,
    clear: () => {
      cache.clear();
      inFlight.clear();
    },
  };
};
