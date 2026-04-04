import { BaseEntity } from 'src/common/entities/base.entity';
import { Place } from 'src/modules/place/entities/place.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';

@Entity('place_pricing')
export class PlacePricing extends BaseEntity {
  @ManyToOne(() => Place, (place) => place.pricings)
  @JoinColumn({ name: 'placeId' })
  place: Place;

  @Column({ name: 'placeId', type: 'uuid' })
  placeId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  basePrice: number;

  @Column({ type: 'varchar', length: 3 })
  currencyCode: string;

  @Column({ type: 'boolean', default: false })
  perPerson: boolean;

  @Column({ type: 'int', nullable: true })
  maxPeople?: number;

  @Column({ type: 'timestamptz', nullable: true })
  validFrom?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  validTo?: Date;
}
