import { Module } from '@nestjs/common';
import { ProviderMembershipService } from './provider-membership.service';
import { ProviderMembershipController } from './provider-membership.controller';

@Module({
  controllers: [ProviderMembershipController],
  providers: [ProviderMembershipService],
})
export class ProviderMembershipModule {}
