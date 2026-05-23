import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Plan } from './plan.entity';

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELLED = 'CANCELLED',
  TRIALING = 'TRIALING',
  PAUSED = 'PAUSED',
}

@Entity('subscriptions')
export class Subscription extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Plan, (p) => p.subscriptions, { nullable: false })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({ type: 'timestamptz', nullable: true })
  currentPeriodStart: Date;

  @Column({ type: 'timestamptz', nullable: true })
  currentPeriodEnd: Date;

  @Column({ type: 'int', default: 1 })
  seats: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerSubscriptionId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerCustomerId?: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
