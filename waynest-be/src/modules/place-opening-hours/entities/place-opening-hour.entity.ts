import { BaseEntity } from 'src/common/entities/base.entity';
import { Place } from 'src/modules/place/entities/place.entity';
import { Entity, Column, ManyToOne } from 'typeorm';

@Entity('place_opening_hours')
export class PlaceOpeningHour extends BaseEntity {
  @ManyToOne(() => Place, (place) => place.openingHours)
  place: Place;

  @Column()
  dayOfWeek: number; // 0=Sunday ... 6=Saturday

  @Column()
  openTime: string; // "08:00"

  @Column()
  closeTime: string; // "17:00"
}
