import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
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
@Index('idx_trip_plans_share_slug', ['shareSlug'], { unique: true })
export class TripPlan extends BaseEntity {
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'user_id', type: 'varchar', nullable: true })
  userId: string | null;

  @Column({ name: 'guest_token', type: 'varchar', nullable: true, length: 64 })
  guestToken: string | null;

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

  // Viral sharing features
  @Column({ name: 'share_slug', type: 'varchar', nullable: true, length: 16 })
  shareSlug: string | null;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @Column({ name: 'title', type: 'varchar', nullable: true })
  title: string | null;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description: string | null;
}
