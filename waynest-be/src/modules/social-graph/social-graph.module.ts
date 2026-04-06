import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { FollowRelation } from './entities/follow-relation.entity';
import { BlockRelation } from './entities/block-relation.entity';
import { MuteRelation } from './entities/mute-relation.entity';
import { Friendship } from './entities/friendship.entity';
import { SocialGraphService } from './social-graph.service';
import { FriendshipService } from './friendship.service';
import { SocialGraphController } from './social-graph.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      FollowRelation,
      BlockRelation,
      MuteRelation,
      Friendship,
    ]),
    NotificationsModule,
    UploadModule,
  ],
  controllers: [SocialGraphController],
  providers: [SocialGraphService, FriendshipService],
  exports: [SocialGraphService, FriendshipService],
})
export class SocialGraphModule {}
