import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('block_relations')
@Index(['blockerId', 'blockedId'], { unique: true })
export class BlockRelation extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'blocker_id' })
  blocker: User;

  @Column({ name: 'blocker_id', type: 'varchar' })
  blockerId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'blocked_id' })
  blocked: User;

  @Column({ name: 'blocked_id', type: 'varchar' })
  blockedId: string;
}

