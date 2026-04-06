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

  private async getRedisClient(): Promise<RedisClientType | null> {
    if (this.redisClient) return this.redisClient;
    const url = process.env.REDIS_URL;
    if (!url) return null;
    try {
      const client: RedisClientType = createClient({ url });
      client.on('error', (err) => console.error('Redis error', err));
      await client.connect();
      this.redisClient = client;
      return client;
    } catch (err) {
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
    // Invalidate unread count cache for recipient
    try {
      const client = await this.getRedisClient();
      if (client) {
        await client.del(`notifications:unread:${input.recipientId}`);
      }
    } catch (err) {
      // best-effort
    }
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
    try {
      const client = await this.getRedisClient();
      if (client) await client.del(`notifications:unread:${userId}`);
    } catch (err) {}
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.notificationsRepo.update(
      { recipientId: userId, isRead: false },
      { isRead: true },
    );
    try {
      const client = await this.getRedisClient();
      if (client) await client.del(`notifications:unread:${userId}`);
    } catch (err) {}
    return { success: true };
  }

  async countUnread(userId: string): Promise<number> {
    try {
      const client = await this.getRedisClient();
      const key = `notifications:unread:${userId}`;
      if (client) {
        const v = await client.get(key);
        if (v !== null) return Number(v);
      }

      const cnt = await this.notificationsRepo.count({
        where: { recipientId: userId, isRead: false },
      });

      if (client) {
        try {
          await client.setEx(
            key,
            Number(process.env.NOTIFICATIONS_CACHE_TTL_SECONDS) || 10,
            String(cnt),
          );
        } catch (err) {}
      }

      return cnt;
    } catch (err) {
      // fallback to DB count on unexpected errors
      return this.notificationsRepo.count({
        where: { recipientId: userId, isRead: false },
      });
    }
  }
}
