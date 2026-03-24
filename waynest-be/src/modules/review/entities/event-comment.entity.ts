import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Event } from 'src/modules/event/entities/event.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { ReviewStatus } from './review.entity';

@Entity('event_comments')
@Index(['eventId', 'createdAt'])
@Index(['parentId'])
export class EventComment extends BaseEntity {
  @ManyToOne(() => Event, { nullable: false })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ name: 'event_id', type: 'varchar' })
  eventId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => EventComment, (comment) => comment.replies, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: EventComment | null;

  @Column({ name: 'parent_id', type: 'varchar', nullable: true })
  parentId: string | null;

  @OneToMany(() => EventComment, (comment) => comment.parent)
  replies: EventComment[];

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.APPROVED,
  })
  status: ReviewStatus;

  @Column({ name: 'moderation_note', type: 'text', nullable: true })
  moderationNote: string | null;

  @Column({ name: 'moderated_at', type: 'timestamp', nullable: true })
  moderatedAt: Date | null;

  @Column({ name: 'moderated_by', type: 'varchar', nullable: true })
  moderatedBy: string | null;
}

