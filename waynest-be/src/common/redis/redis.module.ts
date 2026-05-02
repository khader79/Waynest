import {
  Global,
  Module,
  OnModuleInit,
  OnModuleDestroy,
  Provider,
} from '@nestjs/common';
import {
  initializeRedisClient,
  closeRedisClient,
  getRedisClient,
} from '../utils/redis-client';

export const REDIS_CLIENT_TOKEN = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT_TOKEN,
      useFactory: async (): Promise<any> => {
        return initializeRedisClient();
      },
    },
  ],
  exports: [REDIS_CLIENT_TOKEN],
})
export class RedisModule implements OnModuleDestroy {
  async onModuleDestroy() {
    await closeRedisClient();
  }
}
