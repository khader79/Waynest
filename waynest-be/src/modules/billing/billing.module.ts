import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingHistory } from './entities/billing-history.entity';
import { BillingService } from './billing.service';
import { StubBillingAdapter } from './billing-adapter';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { Plan } from '../subscriptions/entities/plan.entity';
import { CreditWallet } from '../credits/entities/credit-wallet.entity';
import { CreditsModule } from '../credits/credits.module';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { AuditLogService } from '../../common/services/audit-log.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BillingHistory,
      Subscription,
      Plan,
      CreditWallet,
      AuditLog,
    ]),
    CreditsModule,
  ],
  providers: [BillingService, StubBillingAdapter, AuditLogService],
  controllers: [],
  exports: [BillingService, StubBillingAdapter, AuditLogService],
})
export class BillingModule {}
