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
import { ChatService } from './chat.service';
import { getCorsOriginOption } from 'src/common/config-defaults';
import {
  getRedisClient,
  initializeRedisClient,
} from 'src/common/utils/redis-client';

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
}
