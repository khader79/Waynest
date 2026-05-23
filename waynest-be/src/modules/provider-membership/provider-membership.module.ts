import { Module, forwardRef } from '@nestjs/common';
import { ProviderMembershipService } from './provider-membership.service';
import { ProviderMembershipController } from './provider-membership.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderMembership } from './entities/provider-membership.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { CitiesModule } from '../cities/cities.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProviderMembership, User]),
    CitiesModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [ProviderMembershipController],
  providers: [ProviderMembershipService],
  exports: [ProviderMembershipService],
})
export class ProviderMembershipModule {}
