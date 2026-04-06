import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SocialPost } from './social-post.entity';

export enum PostReportStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
}

@Entity('post_reports')
@Index(['postId', 'reporterId'], { unique: true })
export class PostReport extends BaseEntity {
  @ManyToOne(() => SocialPost, { nullable: false })
  @JoinColumn({ name: 'post_id' })
  post: SocialPost;

  @Column({ name: 'post_id', type: 'uuid' })
  postId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @Column({ name: 'reporter_id', type: 'uuid' })
  reporterId: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'enum',
    enum: PostReportStatus,
    default: PostReportStatus.OPEN,
  })
  status: PostReportStatus;

  @Column({ name: 'moderation_note', type: 'text', nullable: true })
  moderationNote: string | null;

  @Column({ name: 'moderated_by', type: 'uuid', nullable: true })
  moderatedBy: string | null;

  @Column({ name: 'moderated_at', type: 'timestamptz', nullable: true })
  moderatedAt: Date | null;
}
