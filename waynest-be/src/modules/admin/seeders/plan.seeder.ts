import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '../../subscriptions/entities/plan.entity';

@Injectable()
export class PlanSeeder {
  private readonly logger = new Logger(PlanSeeder.name);
  constructor(@InjectRepository(Plan) private repo: Repository<Plan>) {}

  async seed() {
    const plans = [
      {
        slug: 'free',
        name: 'Free',
        description: 'خطة مجانية — خطتي سفر شهريًا ومحادثة محدودة مع الذكاء الاصطناعي',
        monthlyCredits: 50,
        priceCents: 0,
        features: {
          trip_plans_per_month: 2,
          ai_chat: true,
          unlimited_trip_plans: false,
          unlimited_ai_chat: false,
        },
      },
      {
        slug: 'pro',
        name: 'Pro',
        description: 'خطة احترافية — 20 خطة سفر و 500 كريديت للذكاء الاصطناعي',
        monthlyCredits: 500,
        priceCents: 1999,
        features: {
          trip_plans_per_month: 20,
          ai_chat: true,
          unlimited_trip_plans: false,
          unlimited_ai_chat: false,
        },
      },
      {
        slug: 'ultra',
        name: 'Ultra',
        description: 'خطة غير محدودة — كل شيء غير محدود',
        monthlyCredits: 999999,
        priceCents: 5999,
        features: {
          trip_plans_per_month: -1,
          ai_chat: true,
          unlimited_trip_plans: true,
          unlimited_ai_chat: true,
        },
      },
    ];

    for (const p of plans) {
      const existing = await this.repo.findOne({ where: { slug: p.slug } });
      if (!existing) {
        this.logger.log(`Seeding plan ${p.slug}`);
        const ent = this.repo.create(p as any);
        await this.repo.save(ent);
      }
    }
  }
}
