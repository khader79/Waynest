import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './entities/plan.entity';
import {
  Subscription,
  SubscriptionStatus,
} from './entities/subscription.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Plan) private plansRepo: Repository<Plan>,
    @InjectRepository(Subscription) private subsRepo: Repository<Subscription>,
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
}
