import { Module } from '@nestjs/common';
import { ProviderMembershipService } from './provider-membership.service';
import { ProviderMembershipController } from './provider-membership.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderMembership } from './entities/provider-membership.entity';
import { CitiesModule } from '../cities/cities.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProviderMembership]), CitiesModule],
  controllers: [ProviderMembershipController],
  providers: [ProviderMembershipService],
  exports: [ProviderMembershipService],
})
export class ProviderMembershipModule {}
