import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';

export enum UsageSource {
  API = 'API',
  WEB = 'WEB',
  SYSTEM = 'SYSTEM',
}

@Entity('usage_logs')
export class UsageLog extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Subscription, { nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: Subscription;

  @Column({ type: 'varchar', length: 128 })
  feature: string;

  @Column({ type: 'int', default: 0 })
  costCredits: number;

  @Column({ type: 'jsonb', default: {} })
  context: Record<string, any>;

  @Column({ type: 'enum', enum: UsageSource, default: UsageSource.API })
  source: UsageSource;
}
