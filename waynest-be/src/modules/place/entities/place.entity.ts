import { BaseEntity } from 'src/common/entities/base.entity';
import { City } from 'src/modules/cities/entities/city.entity';
import { Event } from 'src/modules/event/entities/event.entity';
import { PlaceOpeningHour } from 'src/modules/place-opening-hours/entities/place-opening-hour.entity';
import { PlacePricing } from 'src/modules/placepricing/entities/placepricing.entity';
import { Provider } from 'src/modules/providers/entities/provider.entity';
import { Review } from 'src/modules/review/entities/review.entity';
import { PlaceComment } from 'src/modules/review/entities/place-comment.entity';
import { Tag } from 'src/modules/tag/entities/tag.entity';
import type { Point } from 'geojson';
import {
  Entity,
  Index,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

export enum PlaceType {
  HOTEL = 'HOTEL',
  RESTAURANT = 'RESTAURANT',
  ACTIVITY = 'ACTIVITY',
  TOUR = 'TOUR',
  LANDMARK = 'LANDMARK',
  CAFE = 'CAFE',
  PARK = 'PARK',
  SHOP = 'SHOP',
}

@Entity('places')
@Index(['slug'], { unique: true })
export class Place extends BaseEntity {
  @Column({ length: 150 })
  name: string;

  @Column({ length: 180 })
  slug: string;

  @Column('text')
  description: string;

  @Column({ type: 'enum', enum: PlaceType })
  type: PlaceType;

  @Column('decimal', { precision: 9, scale: 6 })
  latitude: number;

  @Column('decimal', { precision: 9, scale: 6 })
  longitude: number;

  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: Point | null;

  @BeforeInsert()
  @BeforeUpdate()
  syncLocationFromCoordinates() {
    if (this.latitude != null && this.longitude != null) {
      this.location = {
        type: 'Point',
        coordinates: [Number(this.longitude), Number(this.latitude)],
      };
    }
  }

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  ratingAverage: number;

  @Column({ type: 'int', default: 0 })
  ratingCount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  imageUrl?: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  address?: string | null;

  @ManyToOne(() => Provider, (provider) => provider.places, {
    onDelete: 'CASCADE',
  })
  provider: Provider;

  @ManyToOne(() => City)
  city: City;

  @ManyToMany(() => Tag)
  @JoinTable()
  tags: Tag[];

  @OneToMany(() => Review, (review) => review.place)
  reviews: Review[];

  @OneToMany(() => PlaceComment, (comment) => comment.place)
  comments: PlaceComment[];

  @OneToMany(() => Event, (event) => event.venue)
  events: Event[];

  @OneToMany(() => PlacePricing, (pricing) => pricing.place)
  pricings: PlacePricing[];

  @OneToMany(() => PlaceOpeningHour, (hour) => hour.place)
  openingHours: PlaceOpeningHour[];
}
