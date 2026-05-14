/**
 * Rate Limiter Utility
 * Abstraction layer for rate limiting with in-memory storage
 * Designed to be swappable with Redis for distributed environments
 */

import { HttpException, HttpStatus } from '@nestjs/common';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limit store
 * Can be replaced with Redis for production distributed systems
 */
class InMemoryRateLimitStore {
  private store = new Map<string, RateLimitRecord>();

  get(key: string): RateLimitRecord | undefined {
    return this.store.get(key);
  }

  set(key: string, record: RateLimitRecord): void {
    this.store.set(key, record);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clean up expired entries (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Abstract rate limiter interface
 * Implement this for different storage backends (Redis, Memcached, etc.)
 */
export interface IRateLimiter {
  checkLimit(identifier: string, config: RateLimitConfig): void;
  getRemainingRequests(identifier: string, config: RateLimitConfig): number;
  resetLimit(identifier: string): void;
}

/**
 * In-memory rate limiter implementation
 * Note: For production with multiple instances, use Redis-based implementation
 */
export class InMemoryRateLimiter implements IRateLimiter {
  private store: InMemoryRateLimitStore;

  constructor() {
    this.store = new InMemoryRateLimitStore();

    // Periodic cleanup every 15 minutes
    setInterval(() => this.store.cleanup(), 15 * 60 * 1000);
  }

  /**
   * Check rate limit for an identifier
   * @throws HttpException with TOO_MANY_REQUESTS if limit exceeded
   */
  checkLimit(identifier: string, config: RateLimitConfig): void {
    const now = Date.now();
    const record = this.store.get(identifier);

    if (!record || now > record.resetTime) {
      // Start new window
      this.store.set(identifier, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return;
    }

    if (record.count >= config.maxRequests) {
      throw new HttpException(
        { messageKey: 'errors.api.rateLimitExceeded' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    this.store.set(identifier, record);
  }

  /**
   * Get remaining requests for an identifier
   */
  getRemainingRequests(identifier: string, config: RateLimitConfig): number {
    const now = Date.now();
    const record = this.store.get(identifier);

    if (!record || now > record.resetTime) {
      return config.maxRequests;
    }

    return Math.max(0, config.maxRequests - record.count);
  }

  /**
   * Reset rate limit for an identifier
   */
  resetLimit(identifier: string): void {
    this.store.delete(identifier);
  }
}

// Default rate limiter instance
export const rateLimiter = new InMemoryRateLimiter();

// Pre-configured rate limit presets
export const RATE_LIMIT_PRESETS = {
  TRIP_GENERATION: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  } as RateLimitConfig,
  API_GENERAL: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  } as RateLimitConfig,
};

/**
 * Decorator factory for rate limiting controller methods
 */
export const applyRateLimit = (
  identifier: string | ((...args: unknown[]) => string),
  config: RateLimitConfig,
) => {
  return (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      const key =
        typeof identifier === 'function' ? identifier(...args) : identifier;
      rateLimiter.checkLimit(key, config);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
};
