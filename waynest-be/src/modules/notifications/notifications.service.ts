import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
  ) {}

  async createNotification(input: {
    recipientId: string;
    actorId?: string | null;
    type: NotificationType;
    message: string;
    meta?: Record<string, unknown>;
  }) {
    const record = this.notificationsRepo.create({
      actorId: input.actorId ?? null,
      isRead: false,
      message: input.message,
      meta: input.meta ?? {},
      recipientId: input.recipientId,
      type: input.type,
    });
    return this.notificationsRepo.save(record);
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
    await this.notificationsRepo.update({ id, recipientId: userId }, { isRead: true });
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.notificationsRepo.update({ recipientId: userId, isRead: false }, { isRead: true });
    return { success: true };
  }
}

