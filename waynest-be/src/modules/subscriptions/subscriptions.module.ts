import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionGuard } from './guards/subscription.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Plan, Subscription])],
  providers: [SubscriptionsService, SubscriptionGuard],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService, SubscriptionGuard],
})
export class SubscriptionsModule {}
