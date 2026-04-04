import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SocialPost } from './social-post.entity';

export enum PostReactionType {
  LIKE = 'LIKE',
}

@Entity('post_reactions')
@Index(['postId', 'userId'], { unique: true })
export class PostReaction extends BaseEntity {
  @ManyToOne(() => SocialPost, { nullable: false })
  @JoinColumn({ name: 'post_id' })
  post: SocialPost;

  @Column({ name: 'post_id', type: 'uuid' })
  postId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: PostReactionType, default: PostReactionType.LIKE })
  type: PostReactionType;
}

