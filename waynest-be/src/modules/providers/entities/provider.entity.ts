import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';

export enum ProviderTypeEnum {
  HOTEL = 'HOTEL',
  RESTAURANT = 'RESTAURANT',
  TOUR_PROVIDER = 'TOUR_PROVIDER',
  EVENT_ORGANIZER = 'EVENT_ORGANIZER',
  ACTIVITY_PROVIDER = 'ACTIVITY_PROVIDER',
}

export enum VerificationStatusEnum {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

@Entity('providers')
@Index(['providerType', 'city'])
@Index(['verificationStatus', 'isActive'])
export class Provider extends BaseEntity {
  @OneToOne(() => User, (user) => user.provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column()
  userId: string;

  @Column({ length: 150 })
  displayName: string;

  @Index({ unique: true })
  @Column({ length: 180 })
  slug: string; 

  @Column({ nullable: true, length: 200 })
  legalName: string;

  @Column({ type: 'enum', enum: ProviderTypeEnum })
  providerType: ProviderTypeEnum;

  @Column({ length: 20 })
  phone: string;

  @Column({ nullable: true, length: 20 })
  secondaryPhone: string;

  @Column({ nullable: true })
  website: string;

  @Column({ length: 2 })
  countryCode: string; 

  @Column({ length: 100 })
  city: string;

  @Column({ type: 'text', nullable: true })
  addressLine: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  longitude: number;

  @Column({ nullable: true, unique: true })
  taxNumber: string;

  @Column({ nullable: true, unique: true })
  registrationNumber: string;

  @Column({
    type: 'enum',
    enum: VerificationStatusEnum,
    default: VerificationStatusEnum.PENDING,
  })
  verificationStatus: VerificationStatusEnum;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPublic: boolean;

 
  @Column({ type: 'int', nullable: true })
  priceLevel: number; 

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxPrice: number;

  @Column({ length: 3, nullable: true })
  currency: string; 

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
  })
  ratingAverage: number;

  @Column({ default: 0 })
  ratingCount: number;
}
