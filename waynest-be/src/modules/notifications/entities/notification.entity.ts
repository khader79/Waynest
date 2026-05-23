import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

export enum NotificationType {
  FOLLOW = 'FOLLOW',
  LIKE = 'LIKE',
  COMMENT = 'COMMENT',
  REPLY = 'REPLY',
  MESSAGE = 'MESSAGE',
  PLAN_COPIED = 'PLAN_COPIED',
  FRIEND_REQUEST = 'FRIEND_REQUEST',
  FRIEND_ACCEPTED = 'FRIEND_ACCEPTED',
  BOOKING_NEW = 'BOOKING_NEW',
  BOOKING_STATUS = 'BOOKING_STATUS',
  REVIEW_NEW = 'REVIEW_NEW',
  CALENDAR_SHARED = 'CALENDAR_SHARED',
  OWNER_CANCELLED = 'OWNER_CANCELLED',
}

@Entity('notifications')
@Index(['recipientId', 'createdAt'])
@Index(['recipientId', 'isRead'])
export class Notification extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ name: 'recipient_id', type: 'uuid' })
  recipientId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  meta: Record<string, unknown>;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;
}
