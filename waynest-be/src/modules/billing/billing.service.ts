import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditWallet } from '../credits/entities/credit-wallet.entity';
import {
  Subscription,
  SubscriptionStatus,
} from '../subscriptions/entities/subscription.entity';
import { Plan } from '../subscriptions/entities/plan.entity';
import { User } from '../users/entities/user.entity';
import { BillingHistory } from './entities/billing-history.entity';
import { CreditEngineService } from '../credits/credit-engine.service';
import { AuditLogService } from '../../common/services/audit-log.service';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Subscription) private subsRepo: Repository<Subscription>,
    @InjectRepository(Plan) private plansRepo: Repository<Plan>,
    @InjectRepository(CreditWallet)
    private walletsRepo: Repository<CreditWallet>,
    @InjectRepository(BillingHistory)
    private historyRepo: Repository<BillingHistory>,
    private creditEngine: CreditEngineService,
    private auditLog: AuditLogService,
  ) {}

  async upgradeUserPlan(userId: string, newPlanId: string, actor?: User) {
    const user = { id: userId } as any;
    const currentSub = await this.subsRepo.findOne({
      where: { user },
      relations: ['plan'],
    });
    const newPlan = await this.plansRepo.findOne({ where: { id: newPlanId } });
    if (!newPlan) throw new Error('Plan not found');

    if (currentSub) {
      currentSub.plan = newPlan;
      currentSub.status = SubscriptionStatus.ACTIVE;
      currentSub.currentPeriodStart = new Date();
      currentSub.currentPeriodEnd = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      );
      await this.subsRepo.save(currentSub);

      await this.auditLog.log(
        'UPGRADE_PLAN',
        'SUBSCRIPTION',
        currentSub.id,
        actor,
        { oldPlan: currentSub.plan.id, newPlan: newPlan.id },
        'Plan upgrade',
      );
    } else {
      const sub = this.subsRepo.create({
        user,
        plan: newPlan,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      await this.subsRepo.save(sub);

      await this.auditLog.log(
        'CREATE_SUBSCRIPTION',
        'SUBSCRIPTION',
        sub.id,
        actor,
        {},
        'New subscription',
      );
    }

    // Grant monthly credits to wallet
    const currentBalance = await this.creditEngine.getBalance(userId);
    if (BigInt(currentBalance) < BigInt(newPlan.monthlyCredits)) {
      const topUp = newPlan.monthlyCredits - Number(currentBalance);
      await this.creditEngine.grant(
        userId,
        topUp,
        { planId: newPlan.id },
        'Monthly credit allocation',
      );
    }
  }

  async downgradeUserPlan(userId: string, newPlanId: string, actor?: User) {
    await this.upgradeUserPlan(userId, newPlanId, actor);
  }

  async cancelSubscription(userId: string, actor?: User) {
    const user = { id: userId } as any;
    const sub = await this.subsRepo.findOne({ where: { user } });
    if (!sub) throw new Error('No active subscription');

    sub.status = SubscriptionStatus.CANCELLED;
    await this.subsRepo.save(sub);

    await this.auditLog.log(
      'CANCEL_SUBSCRIPTION',
      'SUBSCRIPTION',
      sub.id,
      actor,
      {},
      'User cancelled',
    );
  }

  async recordBillingEvent(
    userId: string,
    subscriptionId: string | null,
    provider: string,
    amountCents: number,
    status: string,
    providerChargeId?: string,
  ) {
    const user = { id: userId } as any;
    const sub = subscriptionId ? ({ id: subscriptionId } as any) : null;

    const entryData = {
      user,
      subscription: sub,
      provider,
      amountCents,
      status: status as any,
      providerChargeId,
    };
    const entry = this.historyRepo.create(entryData as any);
    return this.historyRepo.save(entry);
  }

  async getUserBillingHistory(userId: string, limit = 50) {
    return this.historyRepo.find({
      where: { user: { id: userId } } as any,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
