import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Hotel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  location: string;

  @Column()
  city: string;

  @Column()
  country: string;

  @Column('decimal')
  pricePerNight: number;

  @Column()
  stars: number;

  @Column('simple-array')
  amenities: string[]; // يُخزن كـ نص مفصول بفواصل

  @Column({ type: 'text' })
  description: string;

  @Column()
  image: string;

  @Column({ nullable: true })
  website: string;
}
