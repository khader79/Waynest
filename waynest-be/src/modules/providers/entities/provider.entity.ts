import { BaseEntity } from 'src/common/entities/base.entity';
import { Entity, Column, OneToMany, ManyToOne, Index, JoinColumn } from 'typeorm';
import { Place } from 'src/modules/place/entities/place.entity';
import { City } from 'src/modules/cities/entities/city.entity';
import { ProviderMembership } from 'src/modules/provider-membership/entities/provider-membership.entity';
import { User } from 'src/modules/users/entities/user.entity';

export enum VerificationStatusEnum {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export enum ProviderTypeEnum {
  HOTEL = 'HOTEL',
  RESTAURANT = 'RESTAURANT',
  TOUR_PROVIDER = 'TOUR_PROVIDER',
  EVENT_ORGANIZER = 'EVENT_ORGANIZER',
  ACTIVITY_PROVIDER = 'ACTIVITY_PROVIDER',
}

@Entity('providers')
@Index(['verificationStatus', 'isActive'])
export class Provider extends BaseEntity {
  @Column({ length: 150 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  /** Business-page tags / categories (freeform labels, not FK to tag catalog). */
  @Column('simple-array', { nullable: true })
  categories?: string[] | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_user_id' })
  owner?: User | null;

  @Column({ name: 'owner_user_id', type: 'uuid', nullable: true })
  ownerUserId?: string | null;

  @Column({ length: 200, nullable: false })
  slug: string;

  @Column({ type: 'enum', enum: ProviderTypeEnum })
  providerType: ProviderTypeEnum;

  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  taxNumber?: string;

  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  registrationNumber?: string;

  @Column({
    type: 'enum',
    enum: VerificationStatusEnum,
    default: VerificationStatusEnum.PENDING,
  })
  verificationStatus: VerificationStatusEnum;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ length: 50 })
  phone: string;

  @Column({ length: 50, nullable: true })
  secondaryPhone?: string;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  website?: string;

  /** Public business page hero / cover image URL */
  @Column({ name: 'cover_photo_url', type: 'varchar', length: 2048, nullable: true })
  coverPhotoUrl?: string | null;

  /** Business logo shown on public profile */
  @Column({ name: 'logo_url', type: 'varchar', length: 2048, nullable: true })
  logoUrl?: string | null;

  @OneToMany(() => ProviderMembership, (membership) => membership.provider)
  memberships: ProviderMembership[];

  @OneToMany(() => Place, (place) => place.provider)
  places: Place[];

  @ManyToOne(() => City, (city) => city.providers)
  city: City;
}
