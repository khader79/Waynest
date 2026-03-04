import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  BaseEntity,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Provider } from '../../providers/entities/provider.entity';

export enum ProviderRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
}

@Entity('provider_memberships')
export class ProviderMembership extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.providerMemberships, {
    onDelete: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => Provider, (provider) => provider.memberships, {
    onDelete: 'CASCADE',
  })
  provider: Provider;

  @Column({ type: 'enum', enum: ProviderRole })
  providerRole: ProviderRole;
}
