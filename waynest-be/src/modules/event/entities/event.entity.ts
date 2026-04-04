import { BaseEntity } from 'src/common/entities/base.entity';
import { Place } from 'src/modules/place/entities/place.entity';
import { Review } from 'src/modules/review/entities/review.entity';
import { EventComment } from 'src/modules/review/entities/event-comment.entity';
import { Entity, Column, ManyToOne, OneToMany, Index, JoinColumn } from 'typeorm';

@Entity('events')
@Index(['slug'])
export class Event extends BaseEntity {
  @Column({ type: 'varchar', length: 300 })
  title: string;

  /** Human URL segment; nullable for legacy rows until backfilled. */
  @Column({ type: 'varchar', length: 220, nullable: true })
  slug: string | null;

  @Column('text', { nullable: true })
  description?: string;

  @ManyToOne(() => Place, (place) => place.events)
  @JoinColumn({ name: 'venueId' })
  venue: Place;

  @Column({ type: 'timestamptz' })
  startDate: Date;

  @Column({ type: 'timestamptz' })
  endDate: Date;

  @Column({ type: 'int' })
  availableTickets: number;

  @Column('decimal', { precision: 10, scale: 2 })
  ticketPrice: number;

  @Column({ type: 'varchar', length: 3 })
  currencyCode: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Review, (review) => review.event)
  reviews: Review[];

  @OneToMany(() => EventComment, (comment) => comment.event)
  comments: EventComment[];
}
