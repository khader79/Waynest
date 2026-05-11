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

  async isFeatureEnabled(
    userId: string,
    featureKey: string,
    planFeatures?: Record<string, any>,
  ): Promise<boolean> {
    const override = await this.faRepo.findOne({
      where: { user: { id: userId }, featureKey } as any,
    });
    if (override) return override.enabled;
    if (planFeatures && featureKey in planFeatures) {
      const val = planFeatures[featureKey];
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val !== 0;
      return true;
    }
    return false;
  }
}
