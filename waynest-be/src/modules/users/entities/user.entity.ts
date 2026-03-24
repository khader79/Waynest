import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Exclude } from 'class-transformer';
import { ProviderMembership } from 'src/modules/provider-membership/entities/provider-membership.entity';

export enum UserRole {
  USER = 'USER',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface ITravelPreferences {
  currency?: string;
  notifications?: boolean;
  destinations?: string[];
  theme?: 'light' | 'dark';
}

@Entity('users')
export class User extends BaseEntity {
  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Index({ unique: true })
  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  @Exclude()
  passwordHash: string;

  @Column()
  username: string;

  @Index()
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Index()
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: false })
  isPhoneVerified: boolean;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ default: 'en' })
  preferredLanguage: string;

  /** When false, user is omitted from global search results. */
  @Column({ name: 'is_search_visible', default: true })
  isSearchVisible: boolean;

  @Column({ type: 'text', array: true, default: [] })
  allowedDevices?: string[];

  @Column({
    type: 'jsonb',
    nullable: true,
    default: {},
  })
  travelPreferences: ITravelPreferences;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin: Date;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockUntil?: Date;

  @OneToMany(() => ProviderMembership, (membership) => membership.user)
  providerMemberships: ProviderMembership[];
}
