import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
/** Socket.IO adapter backed by Redis for multi-instance deployments (set REDIS_URL). */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(
    app: INestApplication,
    private readonly redisUrl: string,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    try {
      const pubClient = createClient({
        url: this.redisUrl,
        socket: {
          connectTimeout: 1500,
          keepAlive: 30_000,
          reconnectStrategy: () => new Error('Redis unavailable'),
        },
      });
      const subClient = pubClient.duplicate();
      pubClient.on('error', () => {
        this.adapterConstructor = null;
      });
      subClient.on('error', () => {
        this.adapterConstructor = null;
      });
      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.adapterConstructor = createAdapter(pubClient, subClient);
    } catch {
      this.adapterConstructor = null;
    }
  }

  override createIOServer(
    port: number,
    options?: Record<string, unknown>,
  ): unknown {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
