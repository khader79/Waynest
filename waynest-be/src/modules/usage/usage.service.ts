import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageLog } from './entities/usage-log.entity';

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(UsageLog) private usageRepo: Repository<UsageLog>,
  ) {}

  async logUsage(payload: Partial<UsageLog>) {
    const entry = this.usageRepo.create(payload as any);
    return this.usageRepo.save(entry);
  }

  async getUserUsage(userId: string, daysBack = 30) {
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    return this.usageRepo
      .createQueryBuilder('ul')
      .where('ul.user_id = :userId', { userId })
      .andWhere('ul.createdAt >= :since', { since })
      .orderBy('ul.createdAt', 'DESC')
      .getMany();
  }

  async getUsageByFeature(userId: string, daysBack = 30) {
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const logs = await this.usageRepo
      .createQueryBuilder('ul')
      .where('ul.user_id = :userId', { userId })
      .andWhere('ul.createdAt >= :since', { since })
      .getMany();

    const byFeature = new Map<
      string,
      { count: number; totalCredits: number }
    >();
    logs.forEach((log) => {
      const stat = byFeature.get(log.feature) || { count: 0, totalCredits: 0 };
      stat.count += 1;
      stat.totalCredits += log.costCredits || 0;
      byFeature.set(log.feature, stat);
    });

    return Object.fromEntries(byFeature);
  }

  async getDailyUsageStats(userId: string, daysBack = 30) {
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const logs = await this.usageRepo
      .createQueryBuilder('ul')
      .where('ul.user_id = :userId', { userId })
      .andWhere('ul.createdAt >= :since', { since })
      .getMany();

    const byDay = new Map<string, { count: number; totalCredits: number }>();
    logs.forEach((log) => {
      const day = log.createdAt.toISOString().split('T')[0];
      const stat = byDay.get(day) || { count: 0, totalCredits: 0 };
      stat.count += 1;
      stat.totalCredits += log.costCredits || 0;
      byDay.set(day, stat);
    });

    return Object.fromEntries(byDay);
  }
}
