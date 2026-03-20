import { BaseEntity } from 'src/common/entities/base.entity';
import { Entity, Column, OneToMany, ManyToOne, Index } from 'typeorm';
import { Place } from 'src/modules/place/entities/place.entity';
import { City } from 'src/modules/cities/entities/city.entity';
import { ProviderMembership } from 'src/modules/provider-membership/entities/provider-membership.entity';

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

  @Column({ length: 200, nullable: false })
  slug: string;

  @Column({ type: 'enum', enum: ProviderTypeEnum })
  providerType: ProviderTypeEnum;

  @Column({ nullable: true, unique: true })
  taxNumber?: string;

  @Column({ nullable: true, unique: true })
  registrationNumber?: string;

  @Column({
    type: 'enum',
    enum: VerificationStatusEnum,
    default: VerificationStatusEnum.PENDING,
  })
  verificationStatus: VerificationStatusEnum;

  @Column({ default: true })
  isActive: boolean;

  @Column({ length: 50 })
  phone: string;

  @Column({ length: 50, nullable: true })
  secondaryPhone?: string;

  @Column({ nullable: true })
  website?: string;

  @OneToMany(() => ProviderMembership, (membership) => membership.provider)
  memberships: ProviderMembership[];

  @OneToMany(() => Place, (place) => place.provider)
  places: Place[];

  @ManyToOne(() => City, (city) => city.providers)
  city: City;
}
