import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Subscription } from './subscription.entity';

@Entity('plans')
export class Plan extends BaseEntity {
  @Column({ type: 'varchar', length: 64, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', default: 0 })
  monthlyCredits: number;

  @Column({ type: 'int', default: 0 })
  priceCents: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePriceId?: string;

  @Column({ type: 'jsonb', default: {} })
  features: Record<string, any>;

  @OneToMany(() => Subscription, (s) => s.plan)
  subscriptions: Subscription[];
}
