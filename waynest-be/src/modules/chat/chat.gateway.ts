import { Logger, OnModuleInit } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ChatService } from './chat-core.service';
import { getCorsOriginOption } from 'src/common/config-defaults';
import {
  getRedisClient,
  initializeRedisClient,
} from 'src/common/utils/redis-client';
import { CalendarEntry } from '../calendar/entities/calendar-entry.entity';
import { ExpenseService } from '../../trip-planner/expense.service';

type SocketData = {
  userId?: string;
};

type ConversationUpsertPayload = {
  id: string;
  title: string | null;
  isGroup: boolean;
  ownerUserId: string | null;
  members: Array<{
    userId: string;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: string;
    conversationRole: 'MEMBER' | 'ADMIN';
  }>;
  lastMessage: string | null;
  lastMessageAt: string | Date;
  updatedAt: string | Date;
  lastMessageSenderId: string | null;
  unreadCount: number;
};

type JoinPayload = { conversationId: string };
type TypingPayload = { conversationId: string; isTyping: boolean };
type AckDeliveredPayload = { conversationId: string; messageId: string };
type MessageDeletedPayload = {
  conversationId: string;
  messageId: string;
  userId: string;
  deletedAt: string;
};
type MessageEditedPayload = {
  conversationId: string;
  messageId: string;
  userId: string;
  message: Record<string, unknown>;
  editedAt: string;
};
type ReactionUpdatePayload = {
  conversationId: string;
  messageId: string;
  userId: string;
  reactions: Array<{ emoji: string; userId: string }>;
  updatedAt: string;
};

type TripRoomPayload = { tripId: string };

type UpdateTripElementPayload = {
  tripId: string;
  elementId: string;
  updates: {
    title?: string;
    date?: string;
    time?: string;
    endTime?: string;
    notes?: string;
    placeId?: string;
  };
};

type CreateExpensePayload = {
  tripPlanId: string;
  description: string;
  totalAmount: number;
  currencyCode?: string;
  date?: string;
  category?: string;
  splitAmongUserIds: string[];
};

@WebSocketGateway({
  namespace: '/chat',
  transports: ['websocket'],
  cors: {
    origin: getCorsOriginOption(),
    credentials: true,
  },
})
export class ChatGateway
  implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatGateway.name);
  private readonly recentEmits = new Map<string, number>();
  private readonly typingLastEmit = new Map<string, number>();
  private readonly typingCooldownMs = 2500;

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(CalendarEntry)
    private readonly calendarEntryRepo: Repository<CalendarEntry>,
    private readonly dataSource: DataSource,
    private readonly expenseService: ExpenseService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const client = (await initializeRedisClient()) ?? getRedisClient();
      if (client) {
        this.logger.log('ChatGateway connected to Redis for emit dedupe');
      }
    } catch (err) {
      this.logger.warn(
        `Failed to connect Redis for ChatGateway dedupe: ${String(err)}`,
      );
    }

    this.chatService.attachGateway(this);
  }

  private extractToken(client: Socket): string | null {
    const rawAuth = client.handshake.auth as { token?: string } | undefined;
    const fromAuth = rawAuth?.token;
    const header = client.handshake.headers.authorization;
    const fromHeader =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice(7)
        : null;
    const cookieHeader = client.handshake.headers.cookie;
    const fromCookie =
      typeof cookieHeader === 'string'
        ? (cookieHeader
            .split(';')
            .map((c) => c.trim())
            .find((c) => c.startsWith('access_token='))
            ?.split('=')[1] ?? null)
        : null;
    return fromAuth ?? fromHeader ?? fromCookie ?? null;
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret,
      });
      (client.data as SocketData).userId = payload.sub;
      await client.join(`user:${payload.sub}`);
      this.server.to('presence').emit('user_online', {
        userId: payload.sub,
        at: new Date().toISOString(),
      });
      this.logger.log(`Chat connected user=${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = (client.data as SocketData).userId;
    if (!userId) return;
    this.server.to('presence').emit('user_offline', {
      userId,
      at: new Date().toISOString(),
    });
    this.logger.log(`Chat disconnected user=${userId}`);
  }

  async emitNewMessage(
    conversationId: string,
    recipientIds: string[],
    payload: Record<string, unknown>,
  ): Promise<void> {
    const rooms = [...new Set(recipientIds)].map((id) => `user:${id}`);
    if (rooms.length === 0) return;

    const msgId = (payload?.message as any)?.id ?? null;

    const redis = getRedisClient();
    if (msgId && redis) {
      try {
        const key = `recent_emit:${msgId}`;
        const setRes = await redis.set(key, '1', {
          NX: true,
          EX: 5,
        });
        if (setRes === null) {
          this.logger.debug(
            `skip duplicate by redis conversation=${conversationId} messageId=${msgId}`,
          );
          return;
        }
      } catch (err) {
        this.logger.warn(`redis dedupe failed: ${String(err)}`);
      }
    }

    if (msgId) {
      const now = Date.now();
      const last = this.recentEmits.get(msgId) ?? 0;
      if (now - last < 5000) {
        this.logger.debug(
          `skip duplicate recent emit conversation=${conversationId} messageId=${msgId}`,
        );
        return;
      }
      this.recentEmits.set(msgId, now);
      if (this.recentEmits.size > 1000) {
        const cutoff = now - 60_000;
        for (const [k, v] of this.recentEmits) {
          if (v < cutoff) this.recentEmits.delete(k);
        }
      }
    }

    this.logger.debug(
      `emitNewMessage conversation=${conversationId} messageId=${msgId ?? '<no-id>'} targets=${rooms.length}`,
    );
    this.server.to(rooms).emit('message:new', { ...payload, conversationId });
  }

  emitConversationUpsert(
    payload: ConversationUpsertPayload,
    recipientIds: string[] = [],
  ): void {
    const rooms = [...new Set(recipientIds)].map((id) => `user:${id}`);
    if (rooms.length > 0) {
      this.server.to(rooms).emit('conversation:upsert', payload);
    }
  }

  emitConversationRead(
    conversationId: string,
    payload: { conversationId?: string; userId: string; readAt: string },
    recipientIds: string[] = [],
  ): void {
    const rooms = [...new Set(recipientIds)].map((id) => `user:${id}`);
    this.server
      .to(`conversation:${conversationId}`)
      .emit('conversation:read', payload);
    this.server
      .to(`conversation:${conversationId}`)
      .emit('message_seen', { conversationId, ...payload });
    if (rooms.length > 0) {
      this.server.to(rooms).emit('conversation:read', payload);
      this.server
        .to(rooms)
        .emit('message_seen', { conversationId, ...payload });
    }
  }

  emitMessageStatus(
    conversationId: string,
    payload: {
      messageId: string;
      userId: string;
      status: string;
      at: string;
      senderId?: string;
    },
  ): void {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('message:status', payload);
    if (payload.senderId) {
      this.server
        .to(`user:${payload.senderId}`)
        .emit('message:status', payload);
    }
  }

  emitMessageStatusUpdated(
    conversationId: string,
    payload: {
      messageId: string;
      conversationId: string;
      deliveryStatus: string;
      updatedAt: string;
    },
    recipientIds: string[] = [],
  ): void {
    const rooms = [...new Set(recipientIds)].map((id) => `user:${id}`);
    this.server
      .to(`conversation:${conversationId}`)
      .emit('message:status_updated', payload);
    if (rooms.length > 0) {
      this.server.to(rooms).emit('message:status_updated', payload);
    }
  }

  emitMessageDeleted(
    conversationId: string,
    payload: MessageDeletedPayload,
    recipientIds: string[] = [],
  ): void {
    const rooms = [...new Set(recipientIds)].map((id) => `user:${id}`);
    this.server
      .to(`conversation:${conversationId}`)
      .emit('message:deleted', payload);
    if (rooms.length > 0) {
      this.server.to(rooms).emit('message:deleted', payload);
    }
  }

  emitMessageEdited(
    conversationId: string,
    payload: MessageEditedPayload,
    recipientIds: string[] = [],
  ): void {
    const rooms = [...new Set(recipientIds)].map((id) => `user:${id}`);
    this.server
      .to(`conversation:${conversationId}`)
      .emit('message:edited', payload);
    if (rooms.length > 0) {
      this.server.to(rooms).emit('message:edited', payload);
    }
  }

  emitReactionUpdate(
    conversationId: string,
    payload: ReactionUpdatePayload,
    recipientIds: string[] = [],
  ): void {
    const rooms = [...new Set(recipientIds)].map((id) => `user:${id}`);
    this.server
      .to(`conversation:${conversationId}`)
      .emit('reaction_update', payload);
    if (rooms.length > 0) {
      this.server.to(rooms).emit('reaction_update', payload);
    }
  }

  emitTypingIndicator(
    conversationId: string,
    userId: string,
    recipientIds: string[] = [],
  ): void {
    const rooms = [...new Set(recipientIds)].map((id) => `user:${id}`);
    const payload = { conversationId, userId, isTyping: true };
    this.server.to(`conversation:${conversationId}`).emit('typing', payload);
    if (rooms.length > 0) {
      this.server.to(rooms).emit('typing', payload);
    }
  }

  emitStopTypingIndicator(
    conversationId: string,
    userId: string,
    recipientIds: string[] = [],
  ): void {
    const rooms = [...new Set(recipientIds)].map((id) => `user:${id}`);
    const payload = { conversationId, userId, isTyping: false };
    this.server
      .to(`conversation:${conversationId}`)
      .emit('stop_typing', payload);
    if (rooms.length > 0) {
      this.server.to(rooms).emit('stop_typing', payload);
    }
  }

  @SubscribeMessage('join')
  async handleJoin(client: Socket, body: JoinPayload) {
    const userId = (client.data as SocketData).userId;
    if (!userId || !body?.conversationId) return { ok: false };
    const roomName = `conversation:${body.conversationId}`;
    if (client.rooms && client.rooms.has(roomName)) return { ok: true };
    try {
      await this.chatService.assertMember(body.conversationId, userId);
      await client.join(roomName);
      this.logger.debug(
        `join conversation=${body.conversationId} user=${userId}`,
      );
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  @SubscribeMessage('leave')
  async handleLeave(client: Socket, body: JoinPayload) {
    if (!body?.conversationId) return { ok: false };
    await client.leave(`conversation:${body.conversationId}`);
    return { ok: true };
  }

  @SubscribeMessage('typing')
  handleTyping(client: Socket, body: TypingPayload) {
    const userId = (client.data as SocketData).userId;
    if (!userId || !body?.conversationId) return { ok: false };

    void this.chatService
      .assertMember(body.conversationId, userId)
      .then(() => {
        if (body.isTyping) {
          const key = `${body.conversationId}:${userId}`;
          const now = Date.now();
          if (now - (this.typingLastEmit.get(key) ?? 0) < this.typingCooldownMs)
            return;
          this.typingLastEmit.set(key, now);
        }
        const eventName = body.isTyping ? 'typing' : 'stop_typing';
        client.to(`conversation:${body.conversationId}`).emit(eventName, {
          conversationId: body.conversationId,
          userId,
          isTyping: Boolean(body.isTyping),
        });
        this.logger.debug(
          `${eventName} conversation=${body.conversationId} user=${userId}`,
        );
      })
      .catch(() => {});

    return { ok: true };
  }

  @SubscribeMessage('ack:delivered')
  async handleAckDelivered(client: Socket, body: AckDeliveredPayload) {
    const userId = (client.data as SocketData).userId;
    if (!userId || !body?.conversationId || !body?.messageId)
      return { ok: false };
    try {
      await this.chatService.markDelivered(
        body.conversationId,
        body.messageId,
        userId,
      );
      this.logger.debug(
        `ack:delivered conversation=${body.conversationId} message=${body.messageId} user=${userId}`,
      );
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  @SubscribeMessage('join_trip_room')
  async handleJoinTripRoom(client: Socket, body: TripRoomPayload) {
    const userId = (client.data as SocketData).userId;
    if (!userId || !body?.tripId) return { ok: false };
    const roomName = `trip:${body.tripId}`;
    if (client.rooms && client.rooms.has(roomName)) return { ok: true };
    await client.join(roomName);
    this.logger.debug(`join_trip_room trip=${body.tripId} user=${userId}`);
    return { ok: true };
  }

  @SubscribeMessage('leave_trip_room')
  async handleLeaveTripRoom(client: Socket, body: TripRoomPayload) {
    if (!body?.tripId) return { ok: false };
    await client.leave(`trip:${body.tripId}`);
    this.logger.debug(`leave_trip_room trip=${body.tripId}`);
    return { ok: true };
  }

  @SubscribeMessage('update_trip_element')
  async handleUpdateTripElement(
    client: Socket,
    payload: UpdateTripElementPayload,
  ) {
    const userId = (client.data as SocketData).userId;
    if (!userId || !payload?.tripId || !payload?.elementId) {
      return { ok: false, error: 'Invalid payload' };
    }

    try {
      const updatedEntry = await this.dataSource.transaction(
        async (manager) => {
          const repo = manager.getRepository(CalendarEntry);
          const existing = await repo.findOne({
            where: { id: payload.elementId, userId },
          });
          if (!existing) {
            throw new Error('Calendar entry not found or access denied');
          }

          const updates = payload.updates ?? {};
          if (updates.title !== undefined) {
            existing.title = updates.title;
          }
          if (updates.date !== undefined) {
            const parsed = new Date(updates.date);
            if (!isNaN(parsed.getTime())) {
              existing.calendarDate = parsed.toISOString().slice(0, 10);
            }
          }
          if (updates.time !== undefined) {
            existing.startTime = updates.time || null;
          }
          if (updates.endTime !== undefined) {
            existing.endTime = updates.endTime || null;
          }
          if (updates.notes !== undefined) {
            existing.notes = updates.notes || null;
          }
          if (updates.placeId !== undefined) {
            existing.placeId = updates.placeId || null;
          }

          return repo.save(existing);
        },
      );

      client.broadcast.to(`trip:${payload.tripId}`).emit('trip_element_updated', {
        elementId: payload.elementId,
        tripId: payload.tripId,
        updates: payload.updates,
        updatedBy: userId,
        updatedAt: updatedEntry.updatedAt?.toISOString() ?? new Date().toISOString(),
      });

      this.logger.debug(
        `update_trip_element trip=${payload.tripId} element=${payload.elementId} user=${userId}`,
      );
      return { ok: true };
    } catch (err) {
      this.logger.warn(
        `update_trip_element failed: trip=${payload.tripId} element=${payload.elementId} user=${userId} error=${(err as Error).message}`,
      );
      return { ok: false, error: (err as Error).message };
    }
  }

  @SubscribeMessage('create_expense')
  async handleCreateExpense(
    client: Socket,
    payload: CreateExpensePayload,
  ) {
    const userId = (client.data as SocketData).userId;
    if (!userId || !payload?.tripPlanId || !payload?.description || !payload?.totalAmount) {
      return { ok: false, error: 'Invalid payload' };
    }

    try {
      const expense = await this.expenseService.create(
        {
          tripPlanId: payload.tripPlanId,
          description: payload.description,
          totalAmount: payload.totalAmount,
          currencyCode: payload.currencyCode,
          date: payload.date,
          category: payload.category,
          splitAmongUserIds: payload.splitAmongUserIds,
        },
        userId,
      );

      const roomName = `trip:${payload.tripPlanId}`;
      this.server.to(roomName).emit('expense_updated', {
        type: 'created',
        expense,
        updatedBy: userId,
        updatedAt: new Date().toISOString(),
      });

      this.logger.debug(
        `create_expense trip=${payload.tripPlanId} expense=${expense.id} user=${userId}`,
      );
      return { ok: true, expense };
    } catch (err) {
      this.logger.warn(
        `create_expense failed: trip=${payload.tripPlanId} user=${userId} error=${(err as Error).message}`,
      );
      return { ok: false, error: (err as Error).message };
    }
  }

  @SubscribeMessage('delete_expense')
  async handleDeleteExpense(
    client: Socket,
    payload: { tripPlanId: string; expenseId: string },
  ) {
    const userId = (client.data as SocketData).userId;
    if (!userId || !payload?.expenseId) {
      return { ok: false, error: 'Invalid payload' };
    }

    try {
      await this.expenseService.remove(payload.expenseId, userId);

      const roomName = `trip:${payload.tripPlanId}`;
      this.server.to(roomName).emit('expense_updated', {
        type: 'deleted',
        expenseId: payload.expenseId,
        tripPlanId: payload.tripPlanId,
        updatedBy: userId,
        updatedAt: new Date().toISOString(),
      });

      this.logger.debug(
        `delete_expense trip=${payload.tripPlanId} expense=${payload.expenseId} user=${userId}`,
      );
      return { ok: true };
    } catch (err) {
      this.logger.warn(
        `delete_expense failed: expense=${payload.expenseId} user=${userId} error=${(err as Error).message}`,
      );
      return { ok: false, error: (err as Error).message };
    }
  }
}
