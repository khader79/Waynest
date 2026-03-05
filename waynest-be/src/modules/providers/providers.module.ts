import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from './entities/provider.entity';
import { CitiesModule } from '../cities/cities.module';
import { ProviderMembershipModule } from '../provider-membership/provider-membership.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Provider]),
    CitiesModule,
    ProviderMembershipModule,
  ],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
