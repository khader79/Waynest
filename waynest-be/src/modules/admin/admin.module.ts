import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from '../subscriptions/entities/plan.entity';
import { PlanSeeder } from './seeders/plan.seeder';
import { PlanSeedOnStartup } from './seeders/plan-seed-on-startup';
import { AdminBillingController } from './admin-billing.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { BillingModule } from '../billing/billing.module';
import { CreditsModule } from '../credits/credits.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { User } from '../users/entities/user.entity';
import { BillingHistory } from '../billing/entities/billing-history.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { CreditTransaction } from '../credits/entities/credit-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, AuditLog, User, BillingHistory, Subscription, CreditTransaction]),
    BillingModule,
    CreditsModule,
    SubscriptionsModule,
  ],
  providers: [PlanSeeder, PlanSeedOnStartup, AdminDashboardService],
  controllers: [AdminBillingController, AdminDashboardController],
  exports: [PlanSeeder, BillingModule],
})
export class AdminModule {}
