import { BaseEntity } from 'src/common/entities/base.entity';
import { City } from 'src/modules/cities/entities/city.entity';
import { Currency } from 'src/modules/currencies/entities/currency.entity';
import {
  Entity,
  Index,
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

  @Column({ type: 'varchar', length: 150, nullable: true })
  nativeName?: string;

  @Column({ length: 2 })
  alpha2Code: string;

  @Column({ length: 3 })
  alpha3Code: string;

  @Column({ length: 3, nullable: true })
  numericCode?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subregion?: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  capital?: string;

  @Column('bigint', { nullable: true })
  population?: number;

  @Column('float', { nullable: true })
  area?: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  longitude?: number;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  flagUrl?: string;

  @Column({ type: 'boolean', default: true })
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
