import { Logger, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';
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

type SocketData = {
  userId?: string;
};

type ConversationUpsertPayload = {
  id: string;
  title: string | null;
  isGroup: boolean;
  members: Array<{
    userId: string;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: string;
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
  // recent emits cache to avoid duplicate emits from the same process
  private readonly recentEmits = new Map<string, number>();
  private redisClient: ReturnType<typeof createClient> | null = null;
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
    // Attempt to connect a Redis client for cross-instance dedupe if configured
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      if (redisUrl) {
        const client = createClient({ url: redisUrl });
        client.on('error', (err) => this.logger.warn(`Redis client error: ${String(err)}`));
        await client.connect();
        this.redisClient = client;
        this.logger.log('ChatGateway connected to Redis for emit dedupe');
      }
    } catch (err) {
      this.logger.warn(`Failed to connect Redis for ChatGateway dedupe: ${String(err)}`);
      this.redisClient = null;
    }

    this.chatService.attachGateway(this);
  }

  private extractToken(client: Socket): string | null {
    const rawAuth = client.handshake.auth as { token?: string } | undefined;
    const fromAuth = rawAuth?.token;
    const header = client.handshake.headers.authorization;
    const fromHeader =
      typeof header === 'string' && header.startsWith('Bearer ')
        async emitNewMessage(
          conversationId: string,
          recipientIds: string[],
          payload: Record<string, unknown>,
        ): Promise<void> {
    const fromCookie =
      typeof cookieHeader === 'string'
        ? (cookieHeader
            .split(';')
          // Extract message id if present
          const msgId = (payload && (payload as any).message && (payload as any).message.id) || null;

          // Cross-instance dedupe via Redis: atomically set a short-lived key, skip if exists
          if (msgId && this.redisClient) {
            try {
              const key = `recent_emit:${msgId}`;
              const setRes = await this.redisClient.set(key, '1', { NX: true, EX: 5 });
              if (setRes === null) {
                this.logger.debug(
                  `skip emitNewMessage duplicate by redis conversation=${conversationId} messageId=${msgId}`,
                );
                return;
              }
            } catch (err) {
              this.logger.warn(`redis dedupe failed: ${String(err)}`);
            }
          }

          // per-process dedupe guard
          try {
            if (msgId) {
              const last = this.recentEmits.get(msgId) ?? 0;
              const now = Date.now();
              if (now - last < 5000) {
                this.logger.debug(
                  `skip emitNewMessage duplicate recent emit conversation=${conversationId} messageId=${msgId}`,
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
          } catch (err) {
            // swallow logging errors to avoid disrupting normal flow
          }

          this.server.to(rooms).emit('message:new', {
            ...payload,
            conversationId,
          });
  handleDisconnect(client: Socket) {
    const userId = (client.data as SocketData).userId;
    if (!userId) {
      return;
    }
    this.server.to('presence').emit('user_offline', {
      userId,
      at: new Date().toISOString(),
    });
    this.logger.log(`Chat disconnected user=${userId}`);
  }

  emitNewMessage(
    conversationId: string,
    recipientIds: string[],
    payload: Record<string, unknown>,
  ) {
    const rooms = [...new Set(recipientIds)].map((userId) => `user:${userId}`);
    if (rooms.length === 0) {
      return;
    }
    // Log emission for debugging production duplicate issues
    try {
      const msgId =
        (payload && (payload as any).message && (payload as any).message.id) ||
        '<no-id>';
      // local dedupe: if this process already emitted this message very recently, skip
      if (msgId && msgId !== '<no-id>') {
        const last = this.recentEmits.get(msgId) ?? 0;
        const now = Date.now();
        if (now - last < 5000) {
          this.logger.debug(
            `skip emitNewMessage duplicate recent emit conversation=${conversationId} messageId=${msgId}`,
          );
          return;
        }
        this.recentEmits.set(msgId, now);
        // cleanup old entries occasionally
        if (this.recentEmits.size > 1000) {
          const cutoff = now - 60_000;
          for (const [k, v] of this.recentEmits) {
            if (v < cutoff) this.recentEmits.delete(k);
          }
        }
      }

      this.logger.debug(
        `emitNewMessage conversation=${conversationId} messageId=${msgId} targets=${rooms.length}`,
      );
    } catch (err) {
      // swallow logging errors to avoid disrupting normal flow
    }
    this.server.to(rooms).emit('message:new', {
      ...payload,
      conversationId,
    });
    // NOTE: previously the gateway emitted both `message:new` and `new_message`
    // to the same targets which caused clients listening to both events to
    // receive duplicates. Emit a single canonical event to avoid duplicates.
  }

  emitConversationUpsert(
    payload: ConversationUpsertPayload,
    recipientIds: string[] = [],
  ) {
    const rooms = [...new Set(recipientIds)].map((userId) => `user:${userId}`);
    const targets = rooms.length > 0 ? rooms : undefined;
    this.server.to(targets ?? []).emit('conversation:upsert', payload);
  }

  emitConversationRead(
    conversationId: string,
    payload: { conversationId?: string; userId: string; readAt: string },
    recipientIds: string[] = [],
  ) {
    const rooms = [...new Set(recipientIds)].map((userId) => `user:${userId}`);
    this.server
      .to(`conversation:${conversationId}`)
      .emit('conversation:read', payload);
    this.server.to(`conversation:${conversationId}`).emit('message_seen', {
      conversationId,
      ...payload,
    });
    if (rooms.length > 0) {
      this.server.to(rooms).emit('conversation:read', payload);
      this.server.to(rooms).emit('message_seen', {
        conversationId,
        ...payload,
      });
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
  ) {
    const rooms = payload.senderId ? [`user:${payload.senderId}`] : [];
    this.server
      .to(`conversation:${conversationId}`)
      .emit('message:status', payload);
    if (rooms.length > 0) {
      this.server.to(rooms).emit('message:status', payload);
    }
  }

  emitMessageDeleted(
    conversationId: string,
    payload: MessageDeletedPayload,
    recipientIds: string[] = [],
  ) {
    const rooms = [...new Set(recipientIds)].map((userId) => `user:${userId}`);
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
  ) {
    const rooms = [...new Set(recipientIds)].map((userId) => `user:${userId}`);
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
  ) {
    const rooms = [...new Set(recipientIds)].map((userId) => `user:${userId}`);
    this.server
      .to(`conversation:${conversationId}`)
      .emit('reaction_update', payload);
    if (rooms.length > 0) {
      this.server.to(rooms).emit('reaction_update', payload);
    }
  }

  @SubscribeMessage('join')
  async handleJoin(client: Socket, body: JoinPayload) {
    const userId = (client.data as SocketData).userId;
    if (!userId || !body?.conversationId) {
      return { ok: false };
    }
    try {
      await this.chatService.assertMember(body.conversationId, userId);
      await client.join(`conversation:${body.conversationId}`);
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
    if (!body?.conversationId) {
      return { ok: false };
    }
    await client.leave(`conversation:${body.conversationId}`);
    return { ok: true };
  }

  @SubscribeMessage('typing')
  handleTyping(client: Socket, body: TypingPayload) {
    const userId = (client.data as SocketData).userId;
    if (!userId || !body?.conversationId) {
      return { ok: false };
    }

    void this.chatService
      .assertMember(body.conversationId, userId)
      .then(() => {
        if (body.isTyping) {
          const key = `${body.conversationId}:${userId}`;
          const now = Date.now();
          const last = this.typingLastEmit.get(key) ?? 0;
          if (now - last < this.typingCooldownMs) {
            return;
          }
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
    if (!userId || !body?.conversationId || !body?.messageId) {
      return { ok: false };
    }
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
