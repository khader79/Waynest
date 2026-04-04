import { BaseEntity } from 'src/common/entities/base.entity';
import { Place } from 'src/modules/place/entities/place.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';

@Entity('place_opening_hours')
export class PlaceOpeningHour extends BaseEntity {
  @ManyToOne(() => Place, (place) => place.openingHours)
  @JoinColumn({ name: 'placeId' })
  place: Place;

  @Column({ name: 'placeId', type: 'uuid' })
  placeId: string;

  /** 0 = Sunday … 6 = Saturday */
  @Column({ type: 'smallint' })
  dayOfWeek: number;

  @Column({ type: 'varchar', length: 8 })
  openTime: string;

  @Column({ type: 'varchar', length: 8 })
  closeTime: string;
}
