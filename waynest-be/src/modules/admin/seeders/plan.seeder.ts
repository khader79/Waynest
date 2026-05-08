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
        description: 'Free tier',
        monthlyCredits: 100,
        priceCents: 0,
        features: {
          unlimited_projects: false,
          project_limit: 3,
          ai_chat: true,
        },
      },
      {
        slug: 'pro',
        name: 'Pro',
        description: 'Pro tier',
        monthlyCredits: 2000,
        priceCents: 1999,
        features: {
          unlimited_projects: true,
          ai_chat: true,
          premium_export: true,
        },
      },
      {
        slug: 'ultra',
        name: 'Ultra',
        description: 'Ultra tier',
        monthlyCredits: 10000,
        priceCents: 5999,
        features: {
          team_workspace: true,
          analytics_dashboard: true,
          api_access: true,
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
