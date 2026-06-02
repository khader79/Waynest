import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { TripPlan } from './trip-planner.entity';
import { User } from '../../modules/users/entities/user.entity';

@Entity('trip_expenses')
@Index('idx_expenses_trip_plan_id', ['tripPlanId'])
export class Expense extends BaseEntity {
  @ManyToOne(() => TripPlan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_plan_id' })
  tripPlan!: TripPlan;

  @Column({ name: 'trip_plan_id', type: 'uuid' })
  tripPlanId!: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'paid_by_id' })
  paidBy!: User | null;

  @Column({ name: 'paid_by_id', type: 'uuid', nullable: true })
  paidById!: string | null;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount!: number;

  @Column({ type: 'varchar', length: 3, default: 'ILS' })
  currencyCode!: string;

  @Column({ type: 'date', nullable: true })
  date!: string | null;

  @Column({ type: 'jsonb', default: '[]' })
  splitAmongUserIds!: string[];

  @Column({ type: 'boolean', default: false })
  isSettled!: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category!: string | null;
}
