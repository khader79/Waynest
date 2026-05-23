import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from '../../modules/users/entities/user.entity';

@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor?: User;

  @Column({ type: 'varchar', length: 64 })
  action: string;

  @Column({ type: 'varchar', length: 64 })
  targetType: string;

  @Column({ type: 'uuid', nullable: true })
  targetId?: string;

  @Column({ type: 'jsonb', default: {} })
  diff: Record<string, any>;

  @Column({ type: 'varchar', nullable: true })
  reason?: string;
}
