import { Logger, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import {
  getRedisClient,
  initializeRedisClient,
} from 'src/common/utils/redis-client';

type SocketData = { userId?: string };

@WebSocketGateway({
  namespace: '/chat',
  transports: ['websocket'],
})
export class NotificationsGateway
  implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);
  private redisClient: ReturnType<typeof createClient> | null = null;

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const client = (await initializeRedisClient()) ?? getRedisClient();
      if (client) {
        this.redisClient = client;
        this.logger.log('NotificationsGateway connected to Redis for dedupe');
      }
    } catch (err) {
      this.logger.warn(
        `Failed to connect Redis for NotificationsGateway dedupe: ${String(err)}`,
      );
      this.redisClient = null;
    }
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
      this.logger.log(`Notifications connected user=${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = (client.data as SocketData).userId;
    if (!userId) return;
    this.logger.log(`Notifications disconnected user=${userId}`);
  }

  async emitNotification(
    recipientIds: string[],
    payload: Record<string, unknown>,
  ): Promise<void> {
    const rooms = [...new Set(recipientIds)].map((id) => `user:${id}`);
    if (rooms.length === 0) return;

    const notifId = String((payload as any).notificationId ?? '');
    if (notifId && this.redisClient) {
      try {
        const key = `recent_notification:${notifId}`;
        const setRes = await this.redisClient.set(key, '1', {
          NX: true,
          EX: 5,
        });
        if (setRes === null) {
          this.logger.debug(`skip duplicate notification=${notifId}`);
          return;
        }
      } catch (err) {
        this.logger.warn(`redis dedupe failed: ${String(err)}`);
      }
    }

    this.server.to(rooms).emit('notification:new', payload);
  }
}
