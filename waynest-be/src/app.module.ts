import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { ProviderApplicationsModule } from './modules/provider-applications/provider-applications.module';
import { CountriesModule } from './modules/countries/countries.module';
import { CitiesModule } from './modules/cities/cities.module';
import { CurrenciesModule } from './modules/currencies/currencies.module';
import { PlaceModule } from './modules/place/place.module';
import { PlacepricingModule } from './modules/placepricing/placepricing.module';
import { PlaceOpeningHoursModule } from './modules/place-opening-hours/place-opening-hours.module';
import { EventModule } from './modules/event/event.module';
import { ReviewModule } from './modules/review/review.module';
import { TagModule } from './modules/tag/tag.module';
import { ProviderMembershipModule } from './modules/provider-membership/provider-membership.module';
import { TripPlannerModule } from './trip-planner/trip-planner.module';
import { SeedModule } from '../seed/seed.module';
import { EmailVerificationModule } from './modules/email-verification/email-verification.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { TranslationsModule } from './common/translations/translations.module';
import { SocialGraphModule } from './modules/social-graph/social-graph.module';
import { SocialContentModule } from './modules/social-content/social-content.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SearchModule } from './modules/search/search.module';
import { StoriesModule } from './modules/stories/stories.module';
import { UploadModule } from './modules/upload/upload.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { CreditsModule } from './modules/credits/credits.module';
import { FeaturesModule } from './modules/features/features.module';
import { UsageModule } from './modules/usage/usage.module';
import { BillingModule } from './modules/billing/billing.module';
import { AdminModule } from './modules/admin/admin.module';
import { ContactModule } from './modules/contact/contact.module';
import { JobsModule } from './jobs/jobs.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { buildNestTypeOrmOptions } from './database/typeorm.config';
import { RedisModule } from './common/redis/redis.module';
import { PlaceImagesModule } from './modules/place-images/place-images.module';

function readPositiveIntEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function resolveEnvFilePaths(): string[] {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), 'waynest-be', '.env'),
    resolve(__dirname, '..', '.env'),
    resolve(__dirname, '..', '..', '.env'),
  ];

  return candidates.filter(
    (candidate, index) =>
      candidates.indexOf(candidate) === index && existsSync(candidate),
  );
}

for (const envFilePath of [...resolveEnvFilePaths()].reverse()) {
  loadEnv({ path: envFilePath, override: true });
}

@Module({
  imports: [
    RedisModule,
    TranslationsModule,
    UsersModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolveEnvFilePaths(),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildNestTypeOrmOptions(config),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: readPositiveIntEnv('THROTTLE_TTL_MS', 60_000),
        limit: readPositiveIntEnv('THROTTLE_LIMIT', 100),
      },
    ]),
    BullModule.forRootAsync({
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL;
        const redisHost = process.env.REDIS_HOST?.trim() || 'localhost';
        const redisPort = parseInt(process.env.REDIS_PORT?.trim() || '6379', 10);
        const redisDb = parseInt(process.env.REDIS_DB?.trim() || '0', 10);

        const baseConnection = redisUrl
          ? { url: redisUrl, connectTimeout: 1500 }
          : { host: redisHost, port: redisPort, db: redisDb, connectTimeout: 1500 };

        return {
          connection: {
            ...baseConnection,
            maxRetriesPerRequest: null,
            retryStrategy: () => null,
          },
        };
      },
    }),
    AuthModule,
    CountriesModule,
    CitiesModule,
    ProviderMembershipModule,
    ProvidersModule,
    ProviderApplicationsModule,
    CurrenciesModule,
    TagModule,
    ReviewModule,
    EventModule,
    PlacepricingModule,
    PlaceOpeningHoursModule,
    PlaceModule,
    TripPlannerModule,
    PlaceImagesModule,
    SeedModule,
    EmailVerificationModule,
    WishlistModule,
    CalendarModule,
    BookingsModule,
    SocialGraphModule,
    SocialContentModule,
    ChatModule,
    NotificationsModule,
    SearchModule,
    StoriesModule,
    UploadModule,
    SubscriptionsModule,
    CreditsModule,
    FeaturesModule,
    UsageModule,
    BillingModule,
    AdminModule,
    ContactModule,
    JobsModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
