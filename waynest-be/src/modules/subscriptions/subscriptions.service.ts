import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './entities/plan.entity';
import {
  Subscription,
  SubscriptionStatus,
} from './entities/subscription.entity';
import { CreditEngineService } from 'src/modules/credits/credit-engine.service';
import { CreditWallet } from 'src/modules/credits/entities/credit-wallet.entity';
import { InjectRepository as InjectTypeormRepo } from '@nestjs/typeorm';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Plan) private plansRepo: Repository<Plan>,
    @InjectRepository(Subscription) private subsRepo: Repository<Subscription>,
    private creditEngine: CreditEngineService,
    @InjectTypeormRepo(CreditWallet)
    private walletsRepo: Repository<CreditWallet>,
  ) {}

  async listPlans(): Promise<Plan[]> {
    return this.plansRepo.find();
  }

  async getActiveSubscriptionForUser(userId: string) {
    return this.subsRepo.findOne({
      where: { user: { id: userId }, status: SubscriptionStatus.ACTIVE },
      relations: ['plan'],
    });
  }

  async grantMonthlyCreditsForUser(userId: string) {
    const sub = await this.getActiveSubscriptionForUser(userId);
    if (!sub) return { skipped: true, reason: 'no active subscription' };

    const plan = sub.plan as Plan;
    const grantAmount = plan.monthlyCredits || 0;

    if (grantAmount > 0) {
      await this.creditEngine.grant(
        userId,
        grantAmount,
        { planId: plan.id },
        'monthly',
      );
    }

    const wallet = await this.walletsRepo.findOne({
      where: { user: { id: userId } } as any,
    });
    if (wallet) {
      wallet.monthlyQuota = grantAmount;
      await this.walletsRepo.save(wallet);
    }

    const plannerMonthly = plan.features?.plannerMonthly;
    if (typeof plannerMonthly === 'number' && plannerMonthly > 0) {
      await this.creditEngine.grant(
        userId,
        plannerMonthly,
        { planId: plan.id, feature: 'planner' },
        'planner monthly allocation',
      );
    }

    const chatbot = plan.features?.chatbot;
    if (
      chatbot &&
      typeof chatbot.baseCredits === 'number' &&
      chatbot.baseCredits > 0
    ) {
      await this.creditEngine.grant(
        userId,
        chatbot.baseCredits,
        { planId: plan.id, feature: 'chatbot' },
        'chatbot base credits',
      );
    }

    return { granted: true, plan: plan.slug };
  }

  async grantMonthlyCreditsForAll() {
    const subs = await this.subsRepo.find({
      where: { status: SubscriptionStatus.ACTIVE },
      relations: ['plan', 'user'],
    });
    const results: Array<
      | { error?: string }
      | { granted: true; plan: string }
      | { skipped: true; reason: string }
    > = [];
    for (const s of subs) {
      try {
        // @ts-ignore
        results.push(await this.grantMonthlyCreditsForUser(s.user.id));
      } catch (err) {
        results.push({ error: String(err) });
      }
    }
    return results;
  }
}
