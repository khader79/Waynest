import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { FollowRelation } from './entities/follow-relation.entity';
import { BlockRelation } from './entities/block-relation.entity';
import { MuteRelation } from './entities/mute-relation.entity';
import { SocialGraphService } from './social-graph.service';
import { SocialGraphController } from './social-graph.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, FollowRelation, BlockRelation, MuteRelation]),
    NotificationsModule,
  ],
  controllers: [SocialGraphController],
  providers: [SocialGraphService],
  exports: [SocialGraphService],
})
export class SocialGraphModule {}

