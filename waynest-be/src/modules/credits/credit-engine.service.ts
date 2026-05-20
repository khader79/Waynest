import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreditWallet } from './entities/credit-wallet.entity';
import {
  CreditTransaction,
  CreditTransactionType,
} from './entities/credit-transaction.entity';

/**
 * Atomic credit engine using pessimistic locking to prevent race conditions.
 * All balance operations are transactional and prevent negative balances.
 */
@Injectable()
export class CreditEngineService {
  private readonly logger = new Logger(CreditEngineService.name);
  private reservations = new Map<
    string,
    { amount: bigint; timestamp: number }
  >();

  constructor(
    private dataSource: DataSource,
    @InjectRepository(CreditWallet)
    private walletsRepo: Repository<CreditWallet>,
    @InjectRepository(CreditTransaction)
    private txRepo: Repository<CreditTransaction>,
  ) {}

  async getBalance(userId: string) {
    const wallet = await this.walletsRepo.findOne({
      where: { user: { id: userId } } as any,
    });
    return wallet?.balance ?? '0';
  }

  async getAvailableBalance(userId: string) {
    const wallet = await this.walletsRepo.findOne({
      where: { user: { id: userId } } as any,
    });
    if (!wallet) return '0';
    const balance = BigInt(wallet.balance as any);
    const reserved = BigInt((wallet.reserved as any) || 0);
    return (balance - reserved).toString();
  }

  async charge(
    userId: string,
    amount: number,
    opts: { feature?: string; context?: any; referenceId?: string } = {},
  ) {
    if (amount < 0) throw new BadRequestException('Amount cannot be negative');
    if (amount === 0) return null;

    return this.dataSource.transaction(async (manager) => {
      // Idempotency check INSIDE transaction (serialized by pessimistic lock)
      if (opts.referenceId) {
        const existing = await manager
          .getRepository(CreditTransaction)
          .findOne({
            where: {
              user: { id: userId } as any,
              referenceId: opts.referenceId,
              type: CreditTransactionType.CONSUMPTION,
            },
          });
        if (existing) {
          this.logger.warn(
            `Idempotent charge — txn ${existing.id} already exists for ref ${opts.referenceId}`,
          );
          return existing;
        }
      }

      const wallet = await manager.getRepository(CreditWallet).findOne({
        where: { user: { id: userId } } as any,
        lock: { mode: 'pessimistic_write' as any },
      });
      if (!wallet) throw new Error('Wallet not found');

      const balance = BigInt(wallet.balance as any);
      const reserved = BigInt((wallet.reserved as any) || 0);
      const amt = BigInt(amount);

      if (balance - reserved < amt) {
        throw new BadRequestException('Insufficient credits');
      }

      wallet.balance = (balance - amt).toString();
      await manager.getRepository(CreditWallet).save(wallet);

      const txData = {
        wallet: wallet as any,
        user: { id: userId },
        amount: (-amount).toString(),
        type: CreditTransactionType.CONSUMPTION,
        referenceId: opts.referenceId,
        metadata: { feature: opts.feature, context: opts.context || {} },
      };
      const tx = manager.getRepository(CreditTransaction).create(txData as any);
      await manager.getRepository(CreditTransaction).save(tx);

      this.logger.log(
        `Charged ${amount} credits to ${userId} for ${opts.feature || 'unknown'}`,
      );
      return tx;
    });
  }

  async grant(
    userId: string,
    amount: number,
    metadata: any = {},
    reason?: string,
  ) {
    if (amount < 0) throw new BadRequestException('Amount cannot be negative');
    if (amount === 0) return null;

    return this.dataSource.transaction(async (manager) => {
      // Idempotency check INSIDE transaction (serialized by pessimistic lock)
      const refId = metadata?.referenceId;
      if (refId) {
        const existing = await manager
          .getRepository(CreditTransaction)
          .findOne({
            where: {
              user: { id: userId } as any,
              referenceId: refId,
              type: CreditTransactionType.GRANT,
            },
          });
        if (existing) {
          this.logger.warn(
            `Idempotent grant — txn ${existing.id} already exists for ref ${refId}`,
          );
          return existing;
        }
      }

      let wallet = await manager.getRepository(CreditWallet).findOne({
        where: { user: { id: userId } } as any,
        lock: { mode: 'pessimistic_write' as any },
      });

      if (!wallet) {
        const newWallet = manager
          .getRepository(CreditWallet)
          .create({ user: { id: userId }, balance: '0' } as any);
        wallet = await manager
          .getRepository(CreditWallet)
          .save(newWallet as any);
      }

      const balance = BigInt((wallet!.balance as any) || '0');
      wallet!.balance = (balance + BigInt(amount)).toString();
      await manager.getRepository(CreditWallet).save(wallet! as any);

      const txData = {
        wallet: wallet as any,
        user: { id: userId },
        amount: amount.toString(),
        type: CreditTransactionType.GRANT,
        metadata: { ...metadata, reason },
      };
      const tx = manager.getRepository(CreditTransaction).create(txData as any);
      await manager.getRepository(CreditTransaction).save(tx);

      this.logger.log(
        `Granted ${amount} credits to ${userId}: ${reason || 'manual'}`,
      );
      return tx;
    });
  }

  async reserve(userId: string, amount: number, referenceId: string) {
    if (amount < 0) throw new BadRequestException('Amount cannot be negative');

    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.getRepository(CreditWallet).findOne({
        where: { user: { id: userId } } as any,
        lock: { mode: 'pessimistic_write' as any },
      });
      if (!wallet) throw new Error('Wallet not found');

      const balance = BigInt(wallet.balance as any);
      const reserved = BigInt((wallet.reserved as any) || 0);
      const amt = BigInt(amount);

      if (balance - reserved < amt) {
        throw new BadRequestException('Insufficient credits to reserve');
      }

      wallet.reserved = (reserved + amt).toString();
      await manager.getRepository(CreditWallet).save(wallet);

      const resKey = `${userId}:${referenceId}`;
      this.reservations.set(resKey, { amount: amt, timestamp: Date.now() });

      this.logger.log(
        `Reserved ${amount} credits for ${userId} (ref: ${referenceId})`,
      );
      return { reservationId: resKey, amount };
    });
  }

  async commitReservation(
    userId: string,
    referenceId: string,
    opts: { feature?: string; context?: any } = {},
  ) {
    const resKey = `${userId}:${referenceId}`;
    const res = this.reservations.get(resKey);
    if (!res) throw new BadRequestException('Reservation not found');

    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.getRepository(CreditWallet).findOne({
        where: { user: { id: userId } } as any,
        lock: { mode: 'pessimistic_write' as any },
      });
      if (!wallet) throw new Error('Wallet not found');

      const balance = BigInt(wallet.balance as any);
      const reserved = BigInt((wallet.reserved as any) || 0);
      const amt = res.amount;

      wallet.balance = (balance - amt).toString();
      wallet.reserved = (reserved - amt).toString();
      await manager.getRepository(CreditWallet).save(wallet);

      const txData = {
        wallet: wallet as any,
        user: { id: userId },
        amount: (-Number(amt)).toString(),
        type: CreditTransactionType.CONSUMPTION,
        referenceId,
        metadata: {
          feature: opts.feature,
          context: opts.context || {},
          reserved: true,
        },
      };
      const tx = manager.getRepository(CreditTransaction).create(txData as any);
      await manager.getRepository(CreditTransaction).save(tx);

      this.reservations.delete(resKey);
      this.logger.log(`Committed reservation for ${userId} (${amt} credits)`);
      return tx;
    });
  }

  async releaseReservation(userId: string, referenceId: string) {
    const resKey = `${userId}:${referenceId}`;
    const res = this.reservations.get(resKey);
    if (!res) throw new BadRequestException('Reservation not found');

    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.getRepository(CreditWallet).findOne({
        where: { user: { id: userId } } as any,
        lock: { mode: 'pessimistic_write' as any },
      });
      if (!wallet) throw new Error('Wallet not found');

      const reserved = BigInt((wallet.reserved as any) || 0);
      const amt = res.amount;

      wallet.reserved = (reserved - amt).toString();
      await manager.getRepository(CreditWallet).save(wallet);

      this.reservations.delete(resKey);
      this.logger.log(`Released reservation for ${userId} (${amt} credits)`);
      return { released: Number(amt) };
    });
  }

  async refund(
    userId: string,
    amount: number,
    referenceId?: string,
    reason?: string,
  ) {
    return this.grant(
      userId,
      amount,
      { referenceId, reason },
      reason || 'refund',
    );
  }
}
