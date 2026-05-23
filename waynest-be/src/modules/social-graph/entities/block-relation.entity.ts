import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('block_relations')
@Index(['blockerId', 'blockedId'], { unique: true })
@Index(['blockedId', 'blockerId'])
export class BlockRelation extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocker_id' })
  blocker: User;

  @Column({ name: 'blocker_id', type: 'uuid' })
  blockerId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocked_id' })
  blocked: User;

  @Column({ name: 'blocked_id', type: 'uuid' })
  blockedId: string;
}
