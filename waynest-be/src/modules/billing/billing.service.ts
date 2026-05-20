import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditWallet } from '../credits/entities/credit-wallet.entity';
import {
  Subscription,
  SubscriptionStatus,
} from '../subscriptions/entities/subscription.entity';
import { Plan } from '../subscriptions/entities/plan.entity';
import { User } from '../users/entities/user.entity';
import {
  BillingHistory,
  BillingStatus,
} from './entities/billing-history.entity';
import { CreditEngineService } from '../credits/credit-engine.service';
import { AuditLogService } from '../../common/services/audit-log.service';
import { BILLING_ADAPTER, BillingProvider } from './billing-adapter';

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
    @Inject(BILLING_ADAPTER) private billingAdapter: BillingProvider,
  ) {}

  async upgradeUserPlan(userId: string, newPlanId: string, actor?: User) {
    const user = { id: userId } as any;
    const currentSub = await this.subsRepo.findOne({
      where: { user },
      relations: ['plan'],
    });
    const newPlan = await this.plansRepo.findOne({ where: { id: newPlanId } });
    if (!newPlan) throw new Error('Plan not found');

    const logActor = actor || user;

    if (currentSub) {
      const oldPlanId = currentSub.plan?.id;
      const oldPlan = currentSub.plan;
      const isUpgrade = newPlan.priceCents > (oldPlan?.priceCents || 0);

      // Calculate proration for mid-cycle changes
      const { proratedAmount, remainingDays } = this.calculateProration(
        currentSub,
        oldPlan?.priceCents || 0,
        newPlan.priceCents,
      );

      currentSub.plan = newPlan;
      currentSub.status = SubscriptionStatus.ACTIVE;
      currentSub.currentPeriodStart = new Date();
      currentSub.currentPeriodEnd = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      );
      await this.subsRepo.save(currentSub);

      // Record prorated billing event
      await this.recordBillingEvent(
        userId,
        currentSub.id,
        'system',
        proratedAmount,
        BillingStatus.SUCCEEDED,
        `proration_${Date.now()}`,
      );

      await this.auditLog.log(
        isUpgrade ? 'UPGRADE_PLAN' : 'DOWNGRADE_PLAN',
        'SUBSCRIPTION',
        currentSub.id,
        logActor,
        {
          oldPlan: oldPlanId,
          newPlan: newPlan.id,
          proratedAmount,
          remainingDays,
        },
        isUpgrade ? 'Plan upgrade' : 'Plan downgrade',
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

      // Record initial subscription charge
      await this.recordBillingEvent(
        userId,
        sub.id,
        'system',
        newPlan.priceCents,
        BillingStatus.SUCCEEDED,
        `initial_${Date.now()}`,
      );

      await this.auditLog.log(
        'CREATE_SUBSCRIPTION',
        'SUBSCRIPTION',
        sub.id,
        logActor,
        { newPlan: newPlan.id },
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

  private calculateProration(
    sub: Subscription,
    oldPriceCents: number,
    newPriceCents: number,
  ): { proratedAmount: number; remainingDays: number } {
    const now = Date.now();
    const periodStart = sub.currentPeriodStart?.getTime() || now;
    const periodEnd =
      sub.currentPeriodEnd?.getTime() || now + 30 * 24 * 60 * 60 * 1000;
    const totalDays = Math.max(
      1,
      (periodEnd - periodStart) / (24 * 60 * 60 * 1000),
    );
    const elapsedDays = Math.max(
      0,
      (now - periodStart) / (24 * 60 * 60 * 1000),
    );
    const remainingDays = Math.max(0, totalDays - elapsedDays);

    // Prorated: use remaining days of current period
    const unusedCredit = Math.round(
      (oldPriceCents * remainingDays) / totalDays,
    );
    const newPlanCost = Math.round((newPriceCents * remainingDays) / totalDays);

    return {
      proratedAmount: Math.max(0, newPlanCost - unusedCredit),
      remainingDays: Math.round(remainingDays),
    };
  }

  async downgradeUserPlan(userId: string, newPlanId: string, actor?: User) {
    await this.upgradeUserPlan(userId, newPlanId, actor);
  }

  getBillingAdapter(): BillingProvider {
    return this.billingAdapter;
  }

  async createCheckoutSession(userId: string, planId: string) {
    return this.billingAdapter.createCheckoutSession(userId, planId);
  }

  async cancelSubscription(userId: string, actor?: User) {
    const user = { id: userId } as any;
    const sub = await this.subsRepo.findOne({ where: { user } });
    if (!sub) throw new Error('No active subscription');

    // Cancel at provider first
    if (sub.providerSubscriptionId) {
      try {
        await this.billingAdapter.cancelSubscription(
          sub.providerSubscriptionId,
        );
      } catch (err: any) {
        // Log but continue — local cancel still applies
        console.error('Provider cancel failed:', err.message);
      }
    }

    sub.status = SubscriptionStatus.CANCELLED;
    await this.subsRepo.save(sub);

    await this.auditLog.log(
      'CANCEL_SUBSCRIPTION',
      'SUBSCRIPTION',
      sub.id,
      actor || user,
      {},
      'User cancelled',
    );
  }

  async reactivateSubscription(userId: string) {
    const user = { id: userId } as any;
    const sub = await this.subsRepo.findOne({
      where: { user },
      relations: ['plan'],
    });
    if (!sub) throw new Error('No subscription found');
    if (sub.status !== SubscriptionStatus.CANCELLED) {
      throw new Error('Only cancelled subscriptions can be reactivated');
    }

    sub.status = SubscriptionStatus.ACTIVE;
    sub.currentPeriodStart = new Date();
    sub.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.subsRepo.save(sub);

    await this.auditLog.log(
      'REACTIVATE_SUBSCRIPTION',
      'SUBSCRIPTION',
      sub.id,
      user,
      {},
      'User reactivated',
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
