import { BaseEntity } from 'src/common/entities/base.entity';
import { Country } from 'src/modules/countries/entities/country.entity';
import { Entity, Column, ManyToMany } from 'typeorm';

@Entity('currencies')
export class Currency extends BaseEntity {
  @Column({ length: 3, unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'int', nullable: true })
  fractionSize?: number;

  @Column({ type: 'jsonb', nullable: true })
  symbol?: {
    grapheme: string;
    template: string;
    rtl: boolean;
  };

  @Column({ nullable: true })
  uniqSymbol?: string;

  @ManyToMany(() => Country, (country) => country.currencies)
  countries: Country[];
}
