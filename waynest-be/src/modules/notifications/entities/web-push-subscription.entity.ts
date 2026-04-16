import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('web_push_subscriptions')
@Index(['userId'])
@Index(['endpoint'], { unique: true })
export class WebPushSubscription extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'text' })
  endpoint!: string;

  @Column({ type: 'text' })
  p256dh!: string;

  @Column({ type: 'text' })
  auth!: string;

  @Column({ name: 'expiration_time', type: 'bigint', nullable: true })
  expirationTime!: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 1024, nullable: true })
  userAgent!: string | null;
}
