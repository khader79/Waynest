import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowRelation } from '../social-graph/entities/follow-relation.entity';
import { Friendship } from '../social-graph/entities/friendship.entity';
import { User } from '../users/entities/user.entity';
import { StoriesController } from './stories.controller';
import { Story } from './entities/story.entity';
import { StoryView } from './entities/story-view.entity';
import { StoriesService } from './stories.service';
import { UploadModule } from '../upload/upload.module';
import { SocialPost } from '../social-content/entities/social-post.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Story,
      StoryView,
      FollowRelation,
      Friendship,
      User,
      SocialPost,
    ]),
    UploadModule,
  ],
  controllers: [StoriesController],
  providers: [StoriesService],
  exports: [StoriesService],
})
export class StoriesModule {}
