import { Module } from '@nestjs/common';
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
import { SeedModule } from './modules/seed/seed.module';

@Module({
  imports: [
    UsersModule,
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    AuthModule,
    ProvidersModule,
    CountriesModule,
    CitiesModule,
    CurrenciesModule,
    PlaceModule,
    PlacepricingModule,
    PlaceOpeningHoursModule,
    EventModule,
    ReviewModule,
    TagModule,
    ProviderMembershipModule,
    TripPlannerModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
