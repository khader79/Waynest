import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SocialPost } from './social-post.entity';

@Entity('post_comments')
@Index(['postId', 'createdAt'])
@Index(['parentId'])
export class PostComment extends BaseEntity {
  @ManyToOne(() => SocialPost, { nullable: false })
  @JoinColumn({ name: 'post_id' })
  post: SocialPost;

  @Column({ name: 'post_id', type: 'varchar' })
  postId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id', type: 'varchar' })
  authorId: string;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => PostComment, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: PostComment | null;

  @Column({ name: 'parent_id', type: 'varchar', nullable: true })
  parentId: string | null;
}

