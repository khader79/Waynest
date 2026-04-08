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

@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  firstName: string;

  @Column({ type: 'varchar', length: 120 })
  lastName: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 320, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  @Exclude()
  passwordHash: string;

  @Column({ type: 'varchar', length: 64 })
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

  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ type: 'boolean', default: false })
  isPhoneVerified: boolean;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  avatarUrl: string;

  @Column({ name: 'is_search_visible', type: 'boolean', default: true })
  isSearchVisible: boolean;

  @Column({ type: 'text', array: true, default: [] })
  allowedDevices?: string[];

  @Column({ type: 'timestamptz', nullable: true })
  lastLogin: Date;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockUntil?: Date;

  @OneToMany(() => ProviderMembership, (membership) => membership.user)
  providerMemberships: ProviderMembership[];
}
