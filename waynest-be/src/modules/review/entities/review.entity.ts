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
  @ManyToOne(() => Place, (place) => place.reviews, { nullable: true })
  @JoinColumn({ name: 'place_id' })
  place: Place | null;

  @Column({ name: 'place_id', type: 'varchar', nullable: true })
  placeId: string | null;

  @ManyToOne(() => Event, (event) => event.reviews, { nullable: true })
  @JoinColumn({ name: 'event_id' })
  event: Event | null;

  @Column({ name: 'event_id', type: 'varchar', nullable: true })
  eventId: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column()
  rating: number;

  @Column('text', { nullable: true })
  comment?: string;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.APPROVED,
  })
  status: ReviewStatus;

  @Column({ name: 'is_flagged', default: false })
  isFlagged: boolean;

  @Column({ name: 'moderation_note', type: 'text', nullable: true })
  moderationNote: string | null;

  @Column({ name: 'moderated_at', type: 'timestamp', nullable: true })
  moderatedAt: Date | null;

  @Column({ name: 'moderated_by', type: 'varchar', nullable: true })
  moderatedBy: string | null;
}
