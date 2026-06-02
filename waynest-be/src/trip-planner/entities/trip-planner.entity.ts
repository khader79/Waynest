import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../modules/users/entities/user.entity';
import { City } from '../../modules/cities/entities/city.entity';
import { ShareVisibility } from '../dto/trip-sharing.dto';

export interface ITripSlot {
  placeId?: string;
  eventId?: string;
  name: string;
  type?: string;
  duration: string;
  estimatedCost: number;
  ticketPrice?: number;
  persons?: number;
  currencyCode?: string;
  openTime?: string | null;
  closeTime?: string | null;
  imageUrl?: string | null;
}

export interface ITripDay {
  day: number;
  date?: string;
  morning: ITripSlot | null;
  afternoon: ITripSlot | null;
  evening: ITripSlot | null;
  totalDayCost: number;
}

export interface IGeneratedPlan {
  startDate?: string;
  days: ITripDay[];
  totalEstimatedCost: number;
  tips: string[];
}

@Entity('trip_plans')
@Index('idx_trip_plans_share_slug', ['shareSlug'], { unique: true })
export class TripPlan extends BaseEntity {
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ name: 'guest_token', type: 'varchar', nullable: true, length: 64 })
  guestToken!: string | null;

  @ManyToOne(() => City)
  @JoinColumn({ name: 'city_id' })
  city!: City;

  @Column({ name: 'city_id', type: 'uuid' })
  cityId!: string;

  @Column({ type: 'int' })
  days!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  budget!: number;

  @Column({ type: 'int' })
  persons!: number;

  @Column({ type: 'jsonb', nullable: true })
  generatedPlan!: IGeneratedPlan;

  // Viral sharing features
  @Column({ name: 'share_slug', type: 'varchar', nullable: true, length: 16 })
  shareSlug!: string | null;

  @Column({
    name: 'share_visibility',
    type: 'varchar',
    length: 16,
    default: 'PUBLIC',
  })
  shareVisibility!: ShareVisibility;

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic!: boolean;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount!: number;

  @Column({ name: 'title', type: 'varchar', length: 200, nullable: true })
  title!: string | null;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;
}
