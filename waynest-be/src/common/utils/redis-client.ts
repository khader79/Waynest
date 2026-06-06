import { Logger } from '@nestjs/common';
import { createClient } from 'redis';

let instance: any = null;
let isConnecting = false;
const logger = new Logger('RedisClient');

/**
 * Initialize and return the Redis client singleton.
 * Handles connection failures gracefully - returns null if Redis is unavailable.
 */
export async function initializeRedisClient(): Promise<any> {
  if (instance) {
    return instance;
  }

  if (isConnecting) {
    // Wait for ongoing connection attempt
    let attempts = 0;
    while (isConnecting && attempts < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
    return instance;
  }

  isConnecting = true;

  try {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST?.trim();
    const redisPortRaw = process.env.REDIS_PORT?.trim();
    const redisDbRaw = process.env.REDIS_DB?.trim();

    if (!redisUrl && !redisHost && !redisPortRaw && !redisDbRaw) {
      return null;
    }

    const redisPort = parseInt(redisPortRaw || '6379', 10);
    const redisDb = parseInt(redisDbRaw || '0', 10);

    const client = createClient({
      ...(redisUrl ? { url: redisUrl } : { database: redisDb }),
      socket: redisUrl
        ? {
            reconnectStrategy: () => new Error('Redis unavailable'),
            connectTimeout: 1500,
            keepAlive: true,
          }
        : {
            host: redisHost || 'localhost',
            port: redisPort,
            reconnectStrategy: () => new Error('Redis unavailable'),
            connectTimeout: 1500,
            keepAlive: true,
          },
    });

    client.on('error', (err: Error) => {
      logger.warn('Redis client error:', err);
      instance = null;
    });

    client.on('connect', () => {
      logger.log('Redis client connected');
    });

    client.on('reconnecting', () => {
      logger.debug('Redis client reconnecting...');
    });

    client.on('disconnect', () => {
      logger.warn('Redis client disconnected');
      instance = null;
    });

    await client.connect();
    instance = client;
    logger.log('Redis client initialized successfully');
    return instance;
  } catch (err) {
    logger.warn('Redis unavailable; continuing without cache', err);
    try {
      if (instance) {
        await instance.quit();
      }
    } catch {
      // best effort cleanup
    }
    instance = null;
    return null;
  } finally {
    isConnecting = false;
  }
}

/**
 * Get the Redis client instance (may be null if not connected).
 */
export function getRedisClient(): any {
  if (!instance) {
    return null;
  }

  if (instance.isReady) {
    return instance;
  }

  return null;
}

/**
 * Close the Redis client connection.
 */
export async function closeRedisClient(): Promise<void> {
  if (instance) {
    await instance.quit();
    instance = null;
  }
}
