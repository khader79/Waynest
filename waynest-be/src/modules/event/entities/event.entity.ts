import { BaseEntity } from 'src/common/entities/base.entity';
import { Place } from 'src/modules/place/entities/place.entity';
import { Review } from 'src/modules/review/entities/review.entity';
import { EventComment } from 'src/modules/review/entities/event-comment.entity';
import { Entity, Column, ManyToOne, OneToMany, Index } from 'typeorm';

@Entity('events')
@Index(['slug'])
export class Event extends BaseEntity {
  @Column()
  title: string;

  /** Human URL segment; nullable for legacy rows until backfilled. */
  @Column({ type: 'varchar', length: 220, nullable: true })
  slug: string | null;

  @Column('text', { nullable: true })
  description?: string;

  @ManyToOne(() => Place, (place) => place.events)
  venue: Place;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column()
  availableTickets: number;

  @Column('decimal', { precision: 10, scale: 2 })
  ticketPrice: number;

  @Column({ length: 3 })
  currencyCode: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Review, (review) => review.event)
  reviews: Review[];

  @OneToMany(() => EventComment, (comment) => comment.event)
  comments: EventComment[];
}
