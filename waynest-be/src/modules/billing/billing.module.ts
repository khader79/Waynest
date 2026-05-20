import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingHistory } from './entities/billing-history.entity';
import { Invoice } from './entities/invoice.entity';
import { BillingService } from './billing.service';
import { StubBillingAdapter, BILLING_ADAPTER } from './billing-adapter';
import { StripeBillingAdapter } from './stripe-billing-adapter';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { Plan } from '../subscriptions/entities/plan.entity';
import { CreditWallet } from '../credits/entities/credit-wallet.entity';
import { CreditsModule } from '../credits/credits.module';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { AuditLogService } from '../../common/services/audit-log.service';
import { BillingController } from './billing.controller';
import { RawBodyMiddleware } from './raw-body.middleware';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BillingHistory,
      Invoice,
      Subscription,
      Plan,
      CreditWallet,
      AuditLog,
    ]),
    CreditsModule,
  ],
  providers: [
    BillingService,
    AuditLogService,
    {
      provide: BILLING_ADAPTER,
      inject: [StripeBillingAdapter, StubBillingAdapter, ConfigService],
      useFactory: (
        stripe: StripeBillingAdapter,
        stub: StubBillingAdapter,
        config: ConfigService,
      ) => {
        const secretKey = config.get<string>('STRIPE_SECRET_KEY')?.trim();
        return secretKey ? stripe : stub;
      },
    },
    StripeBillingAdapter,
    StubBillingAdapter,
  ],
  controllers: [BillingController],
  exports: [BillingService, BILLING_ADAPTER, AuditLogService],
})
export class BillingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RawBodyMiddleware)
      .forRoutes({ path: 'billing/webhook', method: RequestMethod.POST });
  }
}
