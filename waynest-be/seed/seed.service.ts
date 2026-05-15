import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { seedBethlehem, SeedBethlehemResult } from './bethlehem.seed';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from 'src/modules/subscriptions/entities/plan.entity';
import { CreditEngineService } from 'src/modules/credits/credit-engine.service';

interface PlanSetupResult {
  slug: string;
  updated: boolean;
}

@Injectable()
export class SeedService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  seedBethlehem(): Promise<SeedBethlehemResult> {
    return seedBethlehem(this.dataSource);
  }

  async setupSubscriptionPlans(
    plansRepo: Repository<Plan>,
    creditEngine: CreditEngineService,
  ) {
    const desired: Record<string, any> = {
      free: {
        plannerMonthly: 2,
        chatbot: { baseCredits: 5 },
        monthlyCredits: 5,
      },
      standard: {
        plannerMonthly: 10,
        chatbot: { baseCredits: 20 },
        monthlyCredits: 50,
      },
      ultra: {
        plannerMonthly: -1,
        chatbot: { baseCredits: -1 },
        monthlyCredits: 0,
      },
    };

    const results: PlanSetupResult[] = [];
    for (const slug of Object.keys(desired)) {
      const plan = await plansRepo.findOne({ where: { slug } });
      if (!plan) continue;
      plan.features = { ...(plan.features || {}), ...desired[slug] };
      plan.monthlyCredits = desired[slug].monthlyCredits ?? plan.monthlyCredits;
      await plansRepo.save(plan);
      results.push({ slug, updated: true });
    }

    return results;
  }
}
