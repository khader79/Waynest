import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Story } from './story.entity';

@Entity('story_views')
@Unique(['storyId', 'viewerId'])
@Index(['storyId', 'viewerId'])
export class StoryView extends BaseEntity {
  @ManyToOne(() => Story, { nullable: false })
  @JoinColumn({ name: 'story_id' })
  story: Story;

  @Column({ name: 'story_id', type: 'uuid' })
  storyId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'viewer_id' })
  viewer: User;

  @Column({ name: 'viewer_id', type: 'uuid' })
  viewerId: string;
}
