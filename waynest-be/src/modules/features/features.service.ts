import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureAccess } from './entities/feature-access.entity';

@Injectable()
export class FeaturesService {
  constructor(
    @InjectRepository(FeatureAccess) private faRepo: Repository<FeatureAccess>,
  ) {}

  async getOverridesForUser(userId: string) {
    return this.faRepo.find({ where: { user: { id: userId } } as any });
  }

  async isFeatureEnabled(userId: string, featureKey: string): Promise<boolean> {
    const override = await this.faRepo.findOne({
      where: { user: { id: userId }, featureKey } as any,
    });
    if (override) return override.enabled;
    // default fallback: let subscription plan decide (resolved by SubscriptionsService)
    return false;
  }
}
