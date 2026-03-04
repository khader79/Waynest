import { BaseEntity } from 'src/common/entities/base.entity';
import { Place } from 'src/modules/place/entities/place.entity';
import { Entity, Column, ManyToOne } from 'typeorm';

@Entity('events')
export class Event extends BaseEntity {
  @Column()
  title: string;

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
}
