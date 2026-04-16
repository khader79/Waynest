import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createClient, RedisClientType } from 'redis';
import { Notification, NotificationType } from './entities/notification.entity';
import { WebPushSubscription } from './entities/web-push-subscription.entity';
import { UpsertPushSubscriptionDto } from './dto/upsert-push-subscription.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import webpush from 'web-push';
import * as nodemailer from 'nodemailer';
import { User } from '../users/entities/user.entity';

type NotificationChannels = {
  inApp: boolean;
  push: boolean;
  email: boolean;
};

type NotificationPreferencePayload = {
  channels: NotificationChannels;
  typePreferences: Partial<Record<NotificationType, boolean>>;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  private readonly vapidPublicKey: string | null;
  private readonly vapidPrivateKey: string | null;
  private readonly vapidSubject: string;
  private readonly webPushEnabled: boolean;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
    @InjectRepository(WebPushSubscription)
    private readonly pushSubscriptionsRepo: Repository<WebPushSubscription>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    this.vapidPublicKey =
      this.configService.get<string>('WEB_PUSH_VAPID_PUBLIC_KEY')?.trim() ||
      null;
    this.vapidPrivateKey =
      this.configService.get<string>('WEB_PUSH_VAPID_PRIVATE_KEY')?.trim() ||
      null;
    this.vapidSubject =
      this.configService.get<string>('WEB_PUSH_VAPID_SUBJECT')?.trim() ||
      'mailto:support@waynest.app';
    this.webPushEnabled =
      Boolean(this.vapidPublicKey) && Boolean(this.vapidPrivateKey);

    if (!this.webPushEnabled && process.env.NODE_ENV !== 'test') {
      this.logger.warn(
        'Web push is disabled (missing WEB_PUSH_VAPID_PUBLIC_KEY or WEB_PUSH_VAPID_PRIVATE_KEY)',
      );
    }

    this.initializeMailTransporter();
  }

  private mailTransporter: nodemailer.Transporter | null = null;
  private mailFrom: string | null = null;
  private mailFromName = 'Waynest';

  private defaultChannels(): NotificationChannels {
    return {
      inApp: true,
      push: true,
      email: false,
    };
  }

  private normalizeChannels(input: unknown): NotificationChannels {
    const base = this.defaultChannels();
    if (!input || typeof input !== 'object') {
      return base;
    }

    const row = input as Record<string, unknown>;
    return {
      inApp: typeof row.inApp === 'boolean' ? row.inApp : base.inApp,
      push: typeof row.push === 'boolean' ? row.push : base.push,
      email: typeof row.email === 'boolean' ? row.email : base.email,
    };
  }

  private normalizeTypePreferences(
    input: unknown,
  ): Partial<Record<NotificationType, boolean>> {
    const out: Partial<Record<NotificationType, boolean>> = {};

    if (!input || typeof input !== 'object') {
      return out;
    }

    const row = input as Record<string, unknown>;
    for (const type of Object.values(NotificationType)) {
      const value = row[type];
      if (typeof value === 'boolean') {
        out[type] = value;
      }
    }

    return out;
  }

  private isTypeEnabled(
    type: NotificationType,
    prefs: Partial<Record<NotificationType, boolean>>,
  ): boolean {
    if (typeof prefs[type] === 'boolean') {
      return Boolean(prefs[type]);
    }
    return true;
  }

  private async getRecipientPreferences(userId: string): Promise<{
    email: string | null;
    channels: NotificationChannels;
    typePreferences: Partial<Record<NotificationType, boolean>>;
  }> {
    const row = await this.usersRepo.findOne({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        notificationChannels: true,
        notificationTypePreferences: true,
      },
    });

    return {
      email: row?.email ?? null,
      channels: this.normalizeChannels(row?.notificationChannels),
      typePreferences: this.normalizeTypePreferences(
        row?.notificationTypePreferences,
      ),
    };
  }

  async getPreferences(userId: string): Promise<NotificationPreferencePayload> {
    const prefs = await this.getRecipientPreferences(userId);
    return {
      channels: prefs.channels,
      typePreferences: prefs.typePreferences,
    };
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencePayload> {
    const current = await this.getRecipientPreferences(userId);

    const nextChannels = dto.channels
      ? this.normalizeChannels({ ...current.channels, ...dto.channels })
      : current.channels;

    const nextTypePreferences = dto.typePreferences
      ? this.normalizeTypePreferences({
          ...current.typePreferences,
          ...dto.typePreferences,
        })
      : current.typePreferences;

    await this.usersRepo.update(
      { id: userId },
      {
        notificationChannels: nextChannels,
        notificationTypePreferences: nextTypePreferences,
      },
    );

    return {
      channels: nextChannels,
      typePreferences: nextTypePreferences,
    };
  }

  private initializeMailTransporter() {
    const mailHost = this.configService.get<string>('MAIL_HOST')?.trim();
    const mailUser = this.configService.get<string>('MAIL_USER')?.trim();
    const mailPass = this.configService.get<string>('MAIL_PASS')?.trim() || '';

    if (!mailHost || !mailUser || !mailPass) {
      this.mailTransporter = null;
      return;
    }

    const portRaw = this.configService.get<string>('MAIL_PORT');
    const port = portRaw ? Number(portRaw) : 587;
    const secureEnv = this.configService
      .get<string>('MAIL_SECURE')
      ?.toLowerCase();
    const secureFromEnv =
      secureEnv === 'true' || secureEnv === '1' || secureEnv === 'yes';
    const secure = port === 465 ? true : port === 587 ? false : secureFromEnv;

    this.mailFrom = this.configService.get<string>('MAIL_FROM')?.trim() || mailUser;
    this.mailFromName =
      this.configService.get<string>('MAIL_FROM_NAME')?.trim() || 'Waynest';

    this.mailTransporter = nodemailer.createTransport({
      host: mailHost,
      port,
      secure,
      auth: {
        user: mailUser,
        pass: mailPass,
      },
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private resolvePublicAppUrl(): string {
    const candidates = [
      this.configService.get<string>('PUBLIC_APP_URL')?.trim(),
      this.configService.get<string>('FRONTEND_URL')?.trim(),
      this.configService.get<string>('APP_URL')?.trim(),
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      try {
        return new URL(candidate).origin;
      } catch {
        continue;
      }
    }

    return '';
  }

  private buildAbsoluteHref(path: string): string {
    const base = this.resolvePublicAppUrl();
    if (!base) {
      return path;
    }

    try {
      return new URL(path, base).toString();
    } catch {
      return base;
    }
  }

  private async sendEmailNotification(
    recipientEmail: string | null,
    payload: {
      title: string;
      body: string;
      href: string;
    },
  ): Promise<boolean> {
    if (!this.mailTransporter || !recipientEmail || !this.mailFrom) {
      return false;
    }

    const safeEmail = recipientEmail.trim();
    if (!safeEmail) {
      return false;
    }

    const link = this.buildAbsoluteHref(payload.href);
    const safeBody = this.escapeHtml(payload.body);
    const safeLink = this.escapeHtml(link);

    try {
      await this.mailTransporter.sendMail({
        from: `"${this.mailFromName}" <${this.mailFrom}>`,
        to: safeEmail,
        subject: `[Waynest] ${payload.title}`,
        text: `${payload.body}\n\nOpen: ${link}`,
        html: `<p>${safeBody}</p><p><a href="${safeLink}">Open notification</a></p>`,
      });
      return true;
    } catch (error) {
      this.logger.warn(
        `Failed to send notification email to ${safeEmail}: ${String((error as { message?: string })?.message ?? error)}`,
      );
      return false;
    }
  }

  private redisClient: RedisClientType | null = null;
  private redisUnavailableUntil = 0;
  private unreadCountCache = new Map<
    string,
    { value: number; expiresAt: number }
  >();

  private ensureWebPushConfigured(): boolean {
    if (!this.webPushEnabled || !this.vapidPublicKey || !this.vapidPrivateKey) {
      return false;
    }

    try {
      webpush.setVapidDetails(
        this.vapidSubject,
        this.vapidPublicKey,
        this.vapidPrivateKey,
      );
      return true;
    } catch (error) {
      this.logger.warn(
        `Failed to configure web push VAPID keys: ${String(error)}`,
      );
      return false;
    }
  }

  getPushPublicKey(): string | null {
    return this.vapidPublicKey;
  }

  async upsertPushSubscription(
    userId: string,
    dto: UpsertPushSubscriptionDto,
    userAgent?: string,
  ) {
    if (!this.webPushEnabled) {
      throw new BadRequestException('Web push is not configured');
    }

    await this.pushSubscriptionsRepo.upsert(
      {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        expirationTime:
          dto.expirationTime != null
            ? String(Math.trunc(dto.expirationTime))
            : null,
        userAgent:
          typeof userAgent === 'string' && userAgent.trim()
            ? userAgent.trim().slice(0, 1024)
            : null,
      },
      ['endpoint'],
    );

    return { success: true };
  }

  async removePushSubscription(userId: string, endpoint: string) {
    await this.pushSubscriptionsRepo.delete({ userId, endpoint });
    return { success: true };
  }

  private asMetaString(meta: Record<string, unknown>, key: string): string | null {
    const value = meta[key];
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private buildNotificationHref(
    type: NotificationType,
    meta: Record<string, unknown>,
  ): string {
    const postId = this.asMetaString(meta, 'postId');
    const conversationId = this.asMetaString(meta, 'conversationId');
    const placeSlug = this.asMetaString(meta, 'placeSlug');

    if (postId) {
      return `/social/post/${encodeURIComponent(postId)}`;
    }
    if (type === NotificationType.MESSAGE && conversationId) {
      return `/inbox/${encodeURIComponent(conversationId)}`;
    }
    if (type === NotificationType.BOOKING_NEW) {
      return '/account/provider/bookings';
    }
    if (type === NotificationType.BOOKING_STATUS) {
      return '/bookings';
    }
    if (type === NotificationType.REVIEW_NEW && placeSlug) {
      return `/places/${encodeURIComponent(placeSlug)}`;
    }
    if (type === NotificationType.PLAN_COPIED) {
      return '/saved-plans';
    }
    if (
      type === NotificationType.FRIEND_REQUEST ||
      type === NotificationType.FRIEND_ACCEPTED ||
      type === NotificationType.FOLLOW
    ) {
      return '/profile/friends';
    }
    return '/notifications';
  }

  private pushTitleForType(type: NotificationType): string {
    switch (type) {
      case NotificationType.MESSAGE:
        return 'New message';
      case NotificationType.FRIEND_REQUEST:
        return 'New friend request';
      case NotificationType.FRIEND_ACCEPTED:
        return 'Friend request accepted';
      case NotificationType.FOLLOW:
        return 'New follower';
      case NotificationType.BOOKING_NEW:
        return 'New booking';
      case NotificationType.BOOKING_STATUS:
        return 'Booking status updated';
      case NotificationType.REVIEW_NEW:
        return 'New review';
      case NotificationType.PLAN_COPIED:
        return 'Trip copied';
      case NotificationType.LIKE:
        return 'New like';
      case NotificationType.COMMENT:
        return 'New comment';
      case NotificationType.REPLY:
        return 'New reply';
      default:
        return 'New notification';
    }
  }

  private async sendWebPushToUser(
    userId: string,
    payload: {
      title: string;
      body: string;
      href: string;
      notificationId?: string;
      type: NotificationType;
      meta: Record<string, unknown>;
      createdAt: string;
    },
  ): Promise<boolean> {
    if (!this.ensureWebPushConfigured()) {
      return false;
    }

    const subscriptions = await this.pushSubscriptionsRepo.find({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return false;
    }

    const body = JSON.stringify(payload);
    let delivered = false;

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime
              ? Number(subscription.expirationTime)
              : null,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          body,
          {
            TTL: 120,
            urgency: 'high',
          },
        );
        delivered = true;
      } catch (error) {
        const statusCode = Number((error as { statusCode?: number })?.statusCode ?? 0);

        if (statusCode === 404 || statusCode === 410) {
          await this.pushSubscriptionsRepo.delete({ id: subscription.id });
          continue;
        }

        this.logger.warn(
          `Failed to send push notification (user=${userId}, endpoint=${subscription.endpoint}): ${String(
            (error as { message?: string })?.message ?? error,
          )}`,
        );
      }
    }

    return delivered;
  }

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
    const recipientPrefs = await this.getRecipientPreferences(input.recipientId);
    if (!this.isTypeEnabled(input.type, recipientPrefs.typePreferences)) {
      return { skipped: true };
    }

    const meta =
      input.meta && typeof input.meta === 'object' ? input.meta : {};

    const record = {
      actorId: input.actorId ?? null,
      isRead: !recipientPrefs.channels.inApp,
      message: input.message,
      meta,
      recipientId: input.recipientId,
      type: input.type,
    };

    const insertResult = await this.notificationsRepo.insert(record as never);
    const notificationId =
      insertResult.identifiers?.[0]?.id != null
        ? String(insertResult.identifiers[0].id)
        : undefined;

    void this.invalidateUnreadCountCache(input.recipientId);

    const deliveryPayload = {
      title: this.pushTitleForType(input.type),
      body: input.message,
      href: this.buildNotificationHref(input.type, meta),
      notificationId,
      type: input.type,
      meta,
      createdAt: new Date().toISOString(),
    };

    let pushDelivered = false;
    if (recipientPrefs.channels.push) {
      pushDelivered = await this.sendWebPushToUser(
        input.recipientId,
        deliveryPayload,
      );
    }

    if (recipientPrefs.channels.email && !pushDelivered) {
      void this.sendEmailNotification(recipientPrefs.email, {
        title: deliveryPayload.title,
        body: deliveryPayload.body,
        href: deliveryPayload.href,
      });
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
