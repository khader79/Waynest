import { BaseEntity } from 'src/common/entities/base.entity';
import { Place } from 'src/modules/place/entities/place.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('wishlists')
@Index(['userId', 'placeId'], { unique: true })
export class Wishlist extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'place_id' })
  placeId: string;

  @ManyToOne(() => Place, { eager: false })
  @JoinColumn({ name: 'place_id' })
  place: Place;
}
