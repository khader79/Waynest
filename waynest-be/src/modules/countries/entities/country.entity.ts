import { BaseEntity } from 'src/common/entities/base.entity';
import { City } from 'src/modules/cities/entities/city.entity';
import { Currency } from 'src/modules/currencies/entities/currency.entity';
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  JoinTable,
  ManyToMany,
} from 'typeorm';

@Entity('countries')
@Index(['alpha2Code'], { unique: true })
@Index(['alpha3Code'], { unique: true })
export class Country extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true })
  nativeName?: string;

  @Column({ length: 2 })
  alpha2Code: string;

  @Column({ length: 3 })
  alpha3Code: string;

  @Column({ length: 3, nullable: true })
  numericCode?: string;

  @Column({ nullable: true })
  region?: string;

  @Column({ nullable: true })
  subregion?: string;

  @Column({ nullable: true })
  capital?: string;

  @Column('bigint', { nullable: true })
  population?: number;

  @Column('float', { nullable: true })
  area?: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  longitude?: number;

  @Column({ nullable: true })
  flagUrl?: string;

  @Column({ default: true })
  independent: boolean;

  @Column({ type: 'text', array: true, nullable: true })
  callingCodes?: string[];

  @OneToMany(() => City, (city) => city.country)
  cities: City[];

  @ManyToMany(() => Currency, (currency) => currency.countries, {
    cascade: true,
  })
  @JoinTable()
  currencies: Currency[];
}
