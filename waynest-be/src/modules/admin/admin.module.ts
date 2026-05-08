import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from '../subscriptions/entities/plan.entity';
import { PlanSeeder } from './seeders/plan.seeder';
import { AdminBillingController } from './admin-billing.controller';
import { BillingModule } from '../billing/billing.module';
import { CreditsModule } from '../credits/credits.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AuditLog } from '../../common/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, AuditLog]),
    BillingModule,
    CreditsModule,
    SubscriptionsModule,
  ],
  providers: [PlanSeeder],
  controllers: [AdminBillingController],
  exports: [PlanSeeder, BillingModule],
})
export class AdminModule {}
