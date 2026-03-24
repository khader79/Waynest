import { Logger, OnModuleInit } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

const getCorsOrigin = () => process.env.FRONTEND_URL || 'http://localhost:5173';

type SocketData = {
  userId?: string;
};

type JoinPayload = { conversationId: string };
type TypingPayload = { conversationId: string; isTyping: boolean };
type AckDeliveredPayload = { conversationId: string; messageId: string };

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: getCorsOrigin(),
    credentials: true,
  },
})
export class ChatGateway implements OnModuleInit {
  private readonly logger = new Logger(ChatGateway.name);
  private readonly typingLastEmit = new Map<string, number>();
  private readonly typingCooldownMs = 2500;

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
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
    const query = client.handshake.query?.token;
    const fromQuery = typeof query === 'string' ? query : null;
    return fromAuth ?? fromHeader ?? fromQuery ?? null;
  }

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const secret = this.configService.getOrThrow<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        token,
        { secret },
      );
      const userId = payload.sub;
      (client.data as SocketData).userId = userId;
      await client.join(`user:${userId}`);
      this.logger.log(`Chat connected user=${userId}`);
    } catch {
      client.disconnect();
    }
  }

  emitNewMessage(conversationId: string, payload: Record<string, unknown>) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('message:new', payload);
  }

  emitConversationRead(
    conversationId: string,
    payload: { userId: string; readAt: string },
  ) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('conversation:read', payload);
  }

  emitMessageStatus(
    conversationId: string,
    payload: {
      messageId: string;
      userId: string;
      status: string;
      at: string;
    },
  ) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('message:status', payload);
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

        client.to(`conversation:${body.conversationId}`).emit('typing', {
          conversationId: body.conversationId,
          userId,
          isTyping: Boolean(body.isTyping),
        });
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
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }
}
