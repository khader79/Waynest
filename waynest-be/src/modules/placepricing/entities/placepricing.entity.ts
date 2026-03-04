import { BaseEntity } from 'src/common/entities/base.entity';
import { Place } from 'src/modules/place/entities/place.entity';
import { Entity, Column, ManyToOne } from 'typeorm';

@Entity('place_pricing')
export class PlacePricing extends BaseEntity {
  @ManyToOne(() => Place, (place) => place.pricings)
  place: Place;

  @Column('decimal', { precision: 10, scale: 2 })
  basePrice: number;

  @Column({ length: 3 })
  currencyCode: string;

  @Column({ default: false })
  perPerson: boolean;

  @Column({ nullable: true })
  maxPeople?: number;

  @Column({ nullable: true })
  validFrom?: Date;

  @Column({ nullable: true })
  validTo?: Date;
}
