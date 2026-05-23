import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SocialPost } from './social-post.entity';

@Entity('post_saves')
@Index(['postId', 'userId'], { unique: true })
export class PostSave extends BaseEntity {
  @ManyToOne(() => SocialPost, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: SocialPost;

  @Column({ name: 'post_id', type: 'uuid' })
  postId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;
}
