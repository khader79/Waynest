import { BaseEntity } from 'src/common/entities/base.entity';
import { Country } from 'src/modules/countries/entities/country.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cities')
@Index(['name', 'country'], { unique: true })
export class City extends BaseEntity {
  @Index()
  @Column({ length: 150 })
  name: string;

  @ManyToOne(() => Country, (country) => country.cities, {
    onDelete: 'CASCADE',
  })
  country: Country;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  longitude?: number;

  @Column({ nullable: true })
  population?: number;
}
