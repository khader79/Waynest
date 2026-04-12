import { BaseEntity } from 'src/common/entities/base.entity';
import { Event } from 'src/modules/event/entities/event.entity';
import { Provider } from 'src/modules/providers/entities/provider.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

/**
 * Who may view this post (enforced server-side on feed, profile lists, and single-post fetch).
 *
 * - PUBLIC: anyone (including logged-out), subject to block rules.
 * - FOLLOWERS: only users who follow the author (and not blocked); author always sees own posts.
 * - PRIVATE: only the author.
 */
export enum SocialPostVisibility {
  PUBLIC = 'PUBLIC',
  FRIENDS = 'FRIENDS',
  FOLLOWERS = 'FOLLOWERS',
  PRIVATE = 'PRIVATE',
}

@Entity('social_posts')
@Index(['authorId', 'createdAt'])
@Index(['createdAt'])
@Index(['visibility', 'createdAt'])
@Index(['providerId', 'createdAt'])
@Index(['tripPlanId'], { unique: false })
export class SocialPost extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @ManyToOne(() => Provider, { nullable: true })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider | null;

  @Column({ name: 'provider_id', type: 'uuid', nullable: true })
  providerId: string | null;

  @ManyToOne(() => Event, { nullable: true })
  @JoinColumn({ name: 'event_id' })
  event: Event | null;

  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId: string | null;

  @Column({ name: 'trip_plan_id', type: 'uuid', nullable: true })
  tripPlanId: string | null;

  @Column({ name: 'share_slug', type: 'varchar', nullable: true, length: 64 })
  shareSlug: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ name: 'image_urls', type: 'text', array: true, default: '{}' })
  imageUrls: string[];

  @Column({ type: 'jsonb', nullable: true, default: {} })
  snapshot: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: SocialPostVisibility,
    default: SocialPostVisibility.PUBLIC,
  })
  visibility: SocialPostVisibility;
}
