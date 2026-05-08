import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PlanSeeder } from './plan.seeder';

@Injectable()
export class PlanSeedOnStartup implements OnApplicationBootstrap {
  private readonly logger = new Logger(PlanSeedOnStartup.name);
  constructor(private planSeeder: PlanSeeder) {}

  async onApplicationBootstrap() {
    this.logger.log('Auto-seeding plans…');
    try {
      await this.planSeeder.seed();
      this.logger.log('Plans seeded successfully');
    } catch (err) {
      this.logger.error('Plan seeding failed', (err as Error).message);
    }
  }
}
