import { Entity, ManyToOne, Column, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { BaseEntity } from 'src/common/entities/base.entity';

export enum ProviderRole {
  OWNER = 'OWNER',
  /** @deprecated use ADMIN; kept for existing DB rows */
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
  /** @deprecated use EDITOR; kept for existing DB rows */
  STAFF = 'STAFF',
  EDITOR = 'EDITOR',
}

@Entity('provider_memberships')
export class ProviderMembership extends BaseEntity {
  @ManyToOne(() => User, (user) => user.providerMemberships, {
    onDelete: 'CASCADE',
  })
  user!: User;

  @ManyToOne(() => Provider, (provider) => provider.memberships, {
    onDelete: 'CASCADE',
  })
  provider!: Provider;

  @Column({ type: 'enum', enum: ProviderRole })
  providerRole!: ProviderRole;
}
