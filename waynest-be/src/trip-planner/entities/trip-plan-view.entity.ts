import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TripPlan } from './trip-planner.entity';

@Entity('trip_plan_views')
@Index(['tripPlanId', 'viewerUserId'], { unique: true })
@Index(['tripPlanId', 'visitorKey'], { unique: true })
export class TripPlanView extends BaseEntity {
  @ManyToOne(() => TripPlan, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_plan_id' })
  tripPlan!: TripPlan;

  @Column({ name: 'trip_plan_id', type: 'uuid' })
  tripPlanId!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'viewer_user_id' })
  viewerUser!: User | null;

  @Column({ name: 'viewer_user_id', type: 'uuid', nullable: true })
  viewerUserId!: string | null;

  @Column({ name: 'visitor_key', type: 'varchar', length: 128, nullable: true })
  visitorKey!: string | null;
}
