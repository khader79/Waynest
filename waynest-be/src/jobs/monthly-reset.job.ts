import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { CreditWallet } from '../modules/credits/entities/credit-wallet.entity';
import {
  CreditTransaction,
  CreditTransactionType,
} from '../modules/credits/entities/credit-transaction.entity';

const MAX_ROLLOVER_MULTIPLIER = 2;

@Injectable()
export class MonthlyResetJob {
  private readonly logger = new Logger(MonthlyResetJob.name);
  constructor(private dataSource: DataSource) {}

  // Run at 00:05 on the 1st of every month UTC
  @Cron('5 0 1 * *')
  async handle() {
    this.logger.log('Starting monthly credit reset job');
    const conn = this.dataSource;
    const wallets = await conn
      .getRepository(CreditWallet)
      .find({ relations: ['user'] });
    let resetCount = 0;
    let failCount = 0;

    for (const w of wallets) {
      try {
        await conn.transaction(async (manager) => {
          // Re-fetch wallet within transaction with pessimistic lock
          const wallet = await manager.getRepository(CreditWallet).findOne({
            where: { id: w.id },
            lock: { mode: 'pessimistic_write' as any },
          });
          if (!wallet) return;

          const currentBalance = Number(wallet.balance || 0);
          const quota = Number(wallet.monthlyQuota || 0);
          if (quota <= 0) return;

          const userId = (wallet as any).user?.id;
          if (!userId) {
            this.logger.warn(`Wallet ${wallet.id} has no user — skipping`);
            return;
          }

          // Rollover: cap at monthlyQuota * MAX_ROLLOVER_MULTIPLIER
          const newBalance = Math.min(
            currentBalance + quota,
            quota * MAX_ROLLOVER_MULTIPLIER,
          );
          const topUp = newBalance - currentBalance;

          wallet.lastResetAt = new Date();

          if (topUp <= 0) {
            // Already at or above cap — mark reset time, no balance change
            await manager.getRepository(CreditWallet).save(wallet);
            return;
          }

          wallet.balance = newBalance.toString();
          await manager.getRepository(CreditWallet).save(wallet);

          // Record adjustment transaction
          const txData = {
            wallet: { id: wallet.id },
            user: { id: userId },
            amount: topUp.toString(),
            type: CreditTransactionType.ADJUSTMENT,
            metadata: {
              reason: 'monthly_reset',
              previousBalance: currentBalance,
              monthlyQuota: quota,
              rolloverAmount: Math.max(0, currentBalance),
            },
          };
          const txRepo = manager.getRepository(CreditTransaction);
          const tx = txRepo.create(txData as any);
          await txRepo.save(tx);

          resetCount++;
        });
      } catch (err) {
        failCount++;
        this.logger.error(
          `Failed to reset wallet ${w.id}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Monthly reset complete — ${resetCount} succeeded, ${failCount} failed`,
    );
  }
}
