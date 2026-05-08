import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditWallet } from './entities/credit-wallet.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { CreditsService } from './credits.service';
import { CreditEngineService } from './credit-engine.service';
import { CreditsController } from './credits.controller';
import { CreditGuard } from './guards/credit.guard';

@Module({
  imports: [TypeOrmModule.forFeature([CreditWallet, CreditTransaction])],
  providers: [CreditsService, CreditEngineService, CreditGuard],
  controllers: [CreditsController],
  exports: [CreditsService, CreditEngineService, CreditGuard],
})
export class CreditsModule {}
