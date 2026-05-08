import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditWallet } from './entities/credit-wallet.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';

@Injectable()
export class CreditsService {
  constructor(
    @InjectRepository(CreditWallet)
    private walletsRepo: Repository<CreditWallet>,
    @InjectRepository(CreditTransaction)
    private txRepo: Repository<CreditTransaction>,
  ) {}

  async getWalletForUser(userId: string) {
    return this.walletsRepo.findOne({ where: { user: { id: userId } } as any });
  }

  async listTransactions(userId: string) {
    return this.txRepo.find({
      where: { user: { id: userId } } as any,
      order: { createdAt: 'DESC' },
    });
  }
}
