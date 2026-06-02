import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { SocialGraphModule } from '../social-graph/social-graph.module';
import { UploadModule } from '../upload/upload.module';
import { SocialContentModule } from '../social-content/social-content.module';
import { Place } from '../place/entities/place.entity';
import { Wishlist } from '../wishlist/entities/wishlist.entity';
import { TripPlan } from 'src/trip-planner/entities/trip-planner.entity';
import { TripPlannerModule } from 'src/trip-planner/trip-planner.module';
import { CalendarEntry } from '../calendar/entities/calendar-entry.entity';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { Message } from './entities/message.entity';
import { MessageReaction } from './entities/message-reaction.entity';
import { MessageReceipt } from './entities/message-receipt.entity';
import { ChatService } from './chat-core.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { AiConciergeService } from './ai-concierge.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Conversation,
      ConversationMember,
      Message,
      MessageReaction,
      MessageReceipt,
      Place,
      Wishlist,
      TripPlan,
      CalendarEntry,
    ]),
    NotificationsModule,
    AuthModule,
    SocialGraphModule,
    UploadModule,
    TripPlannerModule,
    SocialContentModule,
  ],
  providers: [ChatService, ChatGateway, AiConciergeService],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
