import { BaseEntity } from 'src/common/entities/base.entity';
import { Place } from 'src/modules/place/entities/place.entity';
import { Entity, Column, ManyToMany, Index } from 'typeorm';

@Entity('tags')
@Index(['name'], { unique: true })
export class Tag extends BaseEntity {
  @Column({ length: 50 })
  name: string;

  @ManyToMany(() => Place, (place) => place.tags)
  places: Place[];
}
