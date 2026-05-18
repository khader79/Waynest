const nowMs = () => Date.now();

/**
 * @param {{ ttlMs: number; maxEntries: number }} options
 */
export const createRequestCache = ({ ttlMs, maxEntries }) => {
  const cache = new Map();
  const inFlight = new Map();
  const abortControllers = new Map();

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

    // Create an AbortController if none provided
    const controller = hasSignal ? null : new AbortController();
    const signal = hasSignal ? requestConfig.signal : controller.signal;

    if (!hasSignal) {
      abortControllers.set(key, controller);
    }

    const requestPromise = (async () => {
      try {
        const value = await requestFactory({ signal });
        writeCached(key, value);
        return value;
      } finally {
        if (!hasSignal) {
          abortControllers.delete(key);
        }
      }
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

  const abort = (key) => {
    const controller = abortControllers.get(key);
    if (controller) {
      controller.abort();
      abortControllers.delete(key);
      inFlight.delete(key);
    }
  };

  return {
    run,
    abort,
    clear: () => {
      cache.clear();
      inFlight.clear();
      // Abort all in-flight requests
      for (const [key, controller] of abortControllers.entries()) {
        controller.abort();
      }
      abortControllers.clear();
    },
  };
};
