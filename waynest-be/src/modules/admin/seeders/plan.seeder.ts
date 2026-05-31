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
        description:
          'Essential AI trip planning — 500 credits to explore and plan your next adventure',
        monthlyCredits: 500,
        priceCents: 0,
        features: {
          audience: ['USER', 'PROVIDER'],
          ai_trip_plans_per_month: 2,
          ai_trip_planning: true,
          unlimited_trip_plans: false,
          unlimited_ai_trip_planning: false,
        },
      },
      {
        slug: 'pro',
        name: 'Pro',
        description:
          'For serious travelers — 3,000 credits with expanded AI trip planning and priority support',
        monthlyCredits: 3000,
        priceCents: 1999,
        features: {
          audience: ['USER', 'PROVIDER'],
          ai_trip_plans_per_month: 20,
          ai_trip_planning: true,
          unlimited_trip_plans: false,
          unlimited_ai_trip_planning: false,
        },
      },
      {
        slug: 'ultra',
        name: 'Ultra',
        description:
          'Unlimited AI trip planning — generate as many itineraries as you want, zero restrictions',
        monthlyCredits: 999999,
        priceCents: 5999,
        features: {
          audience: ['USER', 'PROVIDER'],
          ai_trip_plans_per_month: -1,
          ai_trip_planning: true,
          unlimited_trip_plans: true,
          unlimited_ai_trip_planning: true,
        },
      },
    ];

    for (const p of plans) {
      const existing = await this.repo.findOne({ where: { slug: p.slug } });
      if (existing) {
        await this.repo.update(existing.id, p as any);
        this.logger.log(`Updated plan ${p.slug}`);
      } else {
        this.logger.log(`Seeding plan ${p.slug}`);
        const ent = this.repo.create(p as any);
        await this.repo.save(ent);
      }
    }
  }
}
