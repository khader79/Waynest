import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from './entities/provider.entity';
import { Place } from '../place/entities/place.entity';
import { Event } from '../event/entities/event.entity';
import { Tag } from '../tag/entities/tag.entity';
import { CitiesModule } from '../cities/cities.module';
import { ProviderMembershipModule } from '../provider-membership/provider-membership.module';
import { EventModule } from '../event/event.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Provider, Place, Event, Tag]),
    CitiesModule,
    ProviderMembershipModule,
    EventModule,
  ],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
