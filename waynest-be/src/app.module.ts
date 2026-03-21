import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { ProvidersModule } from './modules/providers/providers.module';
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
import { BookingsModule } from './modules/bookings/bookings.module';
import { TranslationsModule } from './common/translations/translations.module';

@Module({
  imports: [
    TranslationsModule,
    UsersModule,
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        const syncOverride = config.get<string>('DB_SYNC');
        const synchronize = syncOverride === 'true' ? true : !isProd;

        const dbSsl = config.get<string>('DB_SSL') === 'true';
        const dbSslRejectUnauthorized =
          config.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !== 'false';

        const sslOption = dbSsl
          ? { rejectUnauthorized: dbSslRejectUnauthorized }
          : undefined;

        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST'),
          port: Number(config.get<string>('DB_PORT')),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME'),
          ssl: sslOption,
          autoLoadEntities: true,
          synchronize,
        };
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    CountriesModule,
    CitiesModule,
    ProviderMembershipModule,
    ProvidersModule,
    CurrenciesModule,
    TagModule,
    ReviewModule,
    EventModule,
    PlacepricingModule,
    PlaceOpeningHoursModule,
    PlaceModule,
    TripPlannerModule,
    SeedModule,
    EmailVerificationModule,
    WishlistModule,
    BookingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
