import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('follow_relations')
@Index(['followerId', 'followingId'], { unique: true })
@Index(['followingId', 'createdAt'])
export class FollowRelation extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'follower_id' })
  follower: User;

  @Column({ name: 'follower_id', type: 'uuid' })
  followerId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'following_id' })
  following: User;

  @Column({ name: 'following_id', type: 'uuid' })
  followingId: string;
}
