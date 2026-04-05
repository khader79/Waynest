import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('stories')
@Index(['authorId', 'createdAt'])
@Index(['expiresAt'])
export class Story extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @Column({ name: 'image_url', type: 'text' })
  imageUrl: string;

  @Column({ type: 'text', nullable: true })
  caption: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;
}
