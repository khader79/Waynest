import { Column, Entity, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CreditTransaction } from './credit-transaction.entity';
import { User } from '../../users/entities/user.entity';

@Entity('credit_wallets')
export class CreditWallet extends BaseEntity {
  @OneToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'bigint', default: 0 })
  balance: string;

  @Column({ type: 'bigint', default: 0 })
  reserved: string;

  @Column({ type: 'int', default: 0 })
  monthlyQuota: number;

  @Column({ type: 'boolean', default: false })
  rolloverAllowed: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastResetAt: Date;

  @OneToMany(() => CreditTransaction, (t) => t.wallet)
  transactions: CreditTransaction[];
}
