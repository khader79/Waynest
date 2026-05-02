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
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisDb = parseInt(process.env.REDIS_DB || '0', 10);

    const client = createClient({
      ...(redisUrl
        ? { url: redisUrl }
        : { host: redisHost, port: redisPort, db: redisDb }),
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            logger.warn('Redis reconnection failed after 10 attempts');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 50, 500);
        },
        connectTimeout: 5000,
        keepAlive: 30000,
      },
    });

    client.on('error', (err: Error) => {
      logger.error('Redis client error:', err);
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
    logger.error('Failed to initialize Redis client:', err);
    return null;
  } finally {
    isConnecting = false;
  }
}

/**
 * Get the Redis client instance (may be null if not connected).
 */
export function getRedisClient(): any {
  return instance;
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
