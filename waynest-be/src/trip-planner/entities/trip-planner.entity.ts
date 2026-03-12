import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { City } from 'src/modules/cities/entities/city.entity';

export interface ITripSlot {
  placeId?: string;
  name: string;
  type?: string;
  duration: string;
  estimatedCost: number;
  openTime?: string;
  closeTime?: string;
}

export interface ITripDay {
  day: number;
  morning: ITripSlot;
  afternoon: ITripSlot;
  evening: ITripSlot;
  totalDayCost: number;
}

export interface IGeneratedPlan {
  days: ITripDay[];
  totalEstimatedCost: number;
  tips: string[];
}

@Entity('trip_plans')
export class TripPlan extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => City)
  @JoinColumn({ name: 'city_id' })
  city: City;

  @Column({ name: 'city_id' })
  cityId: string;

  @Column()
  days: number;

  @Column('decimal', { precision: 10, scale: 2 })
  budget: number;

  @Column()
  persons: number;

  @Column({ type: 'jsonb', nullable: true })
  generatedPlan: IGeneratedPlan;
}
