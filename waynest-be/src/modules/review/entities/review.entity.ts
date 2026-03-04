import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { Place } from 'src/modules/place/entities/place.entity';

@Entity('reviews')
@Index(['user', 'place'], { unique: true })
export class Review extends BaseEntity {
  @ManyToOne(() => Place, (place) => place.reviews)
  place: Place;

  @ManyToOne(() => User)
  user: User;

  @Column()
  rating: number;

  @Column('text', { nullable: true })
  comment?: string;
}
