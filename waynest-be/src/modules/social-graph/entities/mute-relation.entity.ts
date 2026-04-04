import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('mute_relations')
@Index(['muterId', 'mutedId'], { unique: true })
export class MuteRelation extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'muter_id' })
  muter: User;

  @Column({ name: 'muter_id', type: 'uuid' })
  muterId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'muted_id' })
  muted: User;

  @Column({ name: 'muted_id', type: 'uuid' })
  mutedId: string;
}

