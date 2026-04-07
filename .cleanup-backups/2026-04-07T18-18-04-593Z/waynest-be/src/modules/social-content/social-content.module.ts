import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripPlan } from 'src/trip-planner/entities/trip-planner.entity';
import { User } from '../users/entities/user.entity';
import { Provider } from '../providers/entities/provider.entity';
import { SocialGraphModule } from '../social-graph/social-graph.module';
import { Friendship } from '../social-graph/entities/friendship.entity';
import { FollowRelation } from '../social-graph/entities/follow-relation.entity';
import { BlockRelation } from '../social-graph/entities/block-relation.entity';
import { MuteRelation } from '../social-graph/entities/mute-relation.entity';
import { SocialPost } from './entities/social-post.entity';
import { PostReaction } from './entities/post-reaction.entity';
import { PostSave } from './entities/post-save.entity';
import { PostComment } from './entities/post-comment.entity';
import { PostReport } from './entities/post-report.entity';
import { SocialContentService } from './social-content.service';
import { SocialContentController } from './social-content.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadModule } from '../upload/upload.module';
import { Event } from '../event/entities/event.entity';
import { Story } from '../stories/entities/story.entity';
import { Place } from '../place/entities/place.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Provider,
      Place,
      Event,
      TripPlan,
      FollowRelation,
      BlockRelation,
      MuteRelation,
      Friendship,
      SocialPost,
      PostReaction,
      PostSave,
      PostComment,
      PostReport,
      Story,
    ]),
    NotificationsModule,
    UploadModule,
    SocialGraphModule,
  ],
  providers: [SocialContentService],
  controllers: [SocialContentController],
  exports: [SocialContentService],
})
export class SocialContentModule {}
