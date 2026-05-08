import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { CreditWallet } from '../modules/credits/entities/credit-wallet.entity';
import { Plan } from '../modules/subscriptions/entities/plan.entity';

@Injectable()
export class MonthlyResetJob {
  private readonly logger = new Logger(MonthlyResetJob.name);
  constructor(private dataSource: DataSource) {}

  // Run at 00:05 on the 1st of every month UTC
  @Cron('5 0 1 * *')
  async handle() {
    this.logger.log('Starting monthly credit reset job');
    // For large scale, this should enqueue per-user jobs instead of one transaction
    const conn = this.dataSource;
    const wallets = await conn
      .getRepository(CreditWallet)
      .find({ relations: ['user'] });
    for (const w of wallets) {
      try {
        // naive: set balance to monthlyQuota if larger; real logic more complex
        w.balance = w.monthlyQuota.toString();
        w.lastResetAt = new Date();
        await conn.getRepository(CreditWallet).save(w);
      } catch (err) {
        this.logger.error(
          'Failed to reset wallet ' + w.id + ': ' + err.message,
        );
      }
    }
    this.logger.log('Monthly reset complete');
  }
}
