import { Column, Entity, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CreditWallet } from './credit-wallet.entity';
import { User } from '../../users/entities/user.entity';

export enum CreditTransactionType {
  CONSUMPTION = 'CONSUMPTION',
  GRANT = 'GRANT',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
  BONUS = 'BONUS',
}

@Entity('credit_transactions')
@Unique('uq_credit_tx_user_ref_type', ['user', 'referenceId', 'type'])
export class CreditTransaction extends BaseEntity {
  @ManyToOne(() => CreditWallet, (w) => w.transactions, { nullable: false })
  @JoinColumn({ name: 'wallet_id' })
  wallet: CreditWallet;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'bigint' })
  amount: string;

  @Column({ type: 'enum', enum: CreditTransactionType })
  type: CreditTransactionType;

  @Column({ type: 'uuid', nullable: true })
  referenceId?: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
