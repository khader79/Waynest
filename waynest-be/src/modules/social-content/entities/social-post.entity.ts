import { BaseEntity } from 'src/common/entities/base.entity';
import { Provider } from 'src/modules/providers/entities/provider.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

export enum SocialPostVisibility {
  PUBLIC = 'PUBLIC',
  FOLLOWERS = 'FOLLOWERS',
  PRIVATE = 'PRIVATE',
}

@Entity('social_posts')
@Index(['authorId', 'createdAt'])
@Index(['visibility', 'createdAt'])
@Index(['tripPlanId'], { unique: false })
export class SocialPost extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id', type: 'varchar' })
  authorId: string;

  @ManyToOne(() => Provider, { nullable: true })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider | null;

  @Column({ name: 'provider_id', type: 'varchar', nullable: true })
  providerId: string | null;

  @Column({ name: 'trip_plan_id', type: 'varchar', nullable: true })
  tripPlanId: string | null;

  @Column({ name: 'share_slug', type: 'varchar', nullable: true, length: 64 })
  shareSlug: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  snapshot: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: SocialPostVisibility,
    default: SocialPostVisibility.PUBLIC,
  })
  visibility: SocialPostVisibility;
}

