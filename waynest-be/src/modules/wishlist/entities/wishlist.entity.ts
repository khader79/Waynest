import { BaseEntity } from 'src/common/entities/base.entity';
import { Place } from 'src/modules/place/entities/place.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('wishlists')
@Index(['userId', 'placeId'], { unique: true })
export class Wishlist extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'place_id', type: 'uuid', nullable: true })
  placeId: string | null;

  @ManyToOne(() => Place, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'place_id' })
  place: Place;
}
