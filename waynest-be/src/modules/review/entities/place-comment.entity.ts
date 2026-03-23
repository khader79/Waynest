import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Place } from 'src/modules/place/entities/place.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { ReviewStatus } from './review.entity';

@Entity('place_comments')
@Index(['placeId', 'createdAt'])
@Index(['parentId'])
export class PlaceComment extends BaseEntity {
  @ManyToOne(() => Place, { nullable: false })
  @JoinColumn({ name: 'place_id' })
  place: Place;

  @Column({ name: 'place_id', type: 'varchar' })
  placeId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => PlaceComment, (comment) => comment.replies, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: PlaceComment | null;

  @Column({ name: 'parent_id', type: 'varchar', nullable: true })
  parentId: string | null;

  @OneToMany(() => PlaceComment, (comment) => comment.parent)
  replies: PlaceComment[];

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
  })
  status: ReviewStatus;

  @Column({ name: 'moderation_note', type: 'text', nullable: true })
  moderationNote: string | null;

  @Column({ name: 'moderated_at', type: 'timestamp', nullable: true })
  moderatedAt: Date | null;

  @Column({ name: 'moderated_by', type: 'varchar', nullable: true })
  moderatedBy: string | null;
}

