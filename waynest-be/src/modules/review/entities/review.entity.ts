import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Entity, Column, ManyToOne, Index, JoinColumn } from 'typeorm';
import { Place } from 'src/modules/place/entities/place.entity';
import { Event } from 'src/modules/event/entities/event.entity';

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('reviews')
@Index(['user', 'place'], { unique: true })
@Index(['user', 'event'], { unique: true })
@Index(['placeId', 'status'])
export class Review extends BaseEntity {
  @ManyToOne(() => Place, (place) => place.reviews, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'place_id' })
  place: Place | null;

  @Column({ name: 'place_id', type: 'uuid', nullable: true })
  placeId: string | null;

  @ManyToOne(() => Event, (event) => event.reviews, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'event_id' })
  event: Event | null;

  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'smallint', nullable: true })
  rating: number | null;

  @Column('text', { nullable: true })
  comment: string | null;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.APPROVED,
  })
  status: ReviewStatus;

  @Column({ name: 'is_flagged', type: 'boolean', default: false })
  isFlagged: boolean;

  @Column({ name: 'moderation_note', type: 'text', nullable: true })
  moderationNote: string | null;

  @Column({ name: 'moderated_at', type: 'timestamptz', nullable: true })
  moderatedAt: Date | null;

  @Column({ name: 'moderated_by', type: 'uuid', nullable: true })
  moderatedBy: string | null;
}
