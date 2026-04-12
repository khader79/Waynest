import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createClient, RedisClientType } from 'redis';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
  ) {}

  private redisClient: RedisClientType | null = null;
  private redisUnavailableUntil = 0;
  private unreadCountCache = new Map<
    string,
    { value: number; expiresAt: number }
  >();

  private getUnreadCountCache(userId: string): number | null {
    const entry = this.unreadCountCache.get(userId);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      this.unreadCountCache.delete(userId);
      return null;
    }
    return entry.value;
  }

  private setUnreadCountCache(userId: string, value: number) {
    const ttlSeconds =
      Number(process.env.NOTIFICATIONS_CACHE_TTL_SECONDS) || 300;
    this.unreadCountCache.set(userId, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private clearUnreadCountCache(userId: string) {
    this.unreadCountCache.delete(userId);
  }

  private async invalidateUnreadCountCache(userId: string) {
    this.clearUnreadCountCache(userId);
    try {
      const client = await this.getRedisClient();
      if (client) {
        await client.del(`notifications:unread:${userId}`);
      }
    } catch (err) {
      // best-effort
    }
  }

  private async getRedisClient(): Promise<RedisClientType | null> {
    if (this.redisClient) return this.redisClient;
    if (Date.now() < this.redisUnavailableUntil) return null;
    const url = process.env.REDIS_URL;
    if (!url) return null;
    try {
      const client: RedisClientType = createClient({ url });
      client.on('error', (err) => console.error('Redis error', err));
      await client.connect();
      this.redisClient = client;
      return client;
    } catch (err) {
      this.redisUnavailableUntil = Date.now() + 60_000;
      console.error(
        'Failed to connect Redis for notifications cache:',
        err?.message || err,
      );
      return null;
    }
  }

  async createNotification(input: {
    recipientId: string;
    actorId?: string | null;
    type: NotificationType;
    message: string;
    meta?: Record<string, unknown>;
  }) {
    const record = {
      actorId: input.actorId ?? null,
      isRead: false,
      message: input.message,
      meta: input.meta ?? {},
      recipientId: input.recipientId,
      type: input.type,
    };
    await this.notificationsRepo.insert(record as never);
    void this.invalidateUnreadCountCache(input.recipientId);
    return record;
  }

  async listForUser(userId: string, limit = 40) {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    return this.notificationsRepo.find({
      where: { recipientId: userId },
      relations: ['actor'],
      order: { createdAt: 'DESC' },
      take: safeLimit,
    });
  }

  async markOneRead(userId: string, id: string) {
    await this.notificationsRepo.update(
      { id, recipientId: userId },
      { isRead: true },
    );
    void this.invalidateUnreadCountCache(userId);
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.notificationsRepo.update(
      { recipientId: userId, isRead: false },
      { isRead: true },
    );
    void this.invalidateUnreadCountCache(userId);
    return { success: true };
  }

  async countUnread(userId: string): Promise<number> {
    try {
      const cached = this.getUnreadCountCache(userId);
      if (cached !== null) {
        return cached;
      }

      const client = this.redisClient;
      const key = `notifications:unread:${userId}`;
      if (client) {
        try {
          const v = await client.get(key);
          if (v !== null) {
            const count = Number(v);
            this.setUnreadCountCache(userId, count);
            return count;
          }
        } catch (err) {
          // fall through to DB count
        }
      }

      const cnt = await this.notificationsRepo.count({
        where: { recipientId: userId, isRead: false },
      });
      this.setUnreadCountCache(userId, cnt);

      if (client) {
        void client
          .setEx(
            key,
            Number(process.env.NOTIFICATIONS_CACHE_TTL_SECONDS) || 300,
            String(cnt),
          )
          .catch(() => undefined);
      }

      return cnt;
    } catch (err) {
      // fallback to DB count on unexpected errors
      const cnt = await this.notificationsRepo.count({
        where: { recipientId: userId, isRead: false },
      });
      this.setUnreadCountCache(userId, cnt);
      return cnt;
    }
  }
}
