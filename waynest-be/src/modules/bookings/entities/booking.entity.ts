import { BaseEntity } from 'src/common/entities/base.entity';
import { Place } from 'src/modules/place/entities/place.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BookingStatus } from '../enums/booking-status.enum';

@Entity('bookings')
@Index(['placeId', 'status'])
@Index(['userId', 'status'])
export class Booking extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'place_id', type: 'uuid' })
  placeId: string;

  @Column({ type: 'timestamptz' })
  bookingDate: Date;

  @Column({ type: 'int', default: 1 })
  persons: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  totalCost: number | null;

  @Column({ length: 3, default: 'ILS' })
  currencyCode: string;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => Place, { eager: false })
  @JoinColumn({ name: 'place_id' })
  place: Place;
}
