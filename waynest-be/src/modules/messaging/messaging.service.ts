import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { Message } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { assertNoAbusiveContent } from 'src/common/utils/contentModeration';

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Conversation)
    private readonly conversationsRepo: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly membersRepo: Repository<ConversationMember>,
    @InjectRepository(Message)
    private readonly messagesRepo: Repository<Message>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async assertMember(conversationId: string, userId: string) {
    const member = await this.membersRepo.findOne({ where: { conversationId, userId } });
    if (!member) {
      throw new ForbiddenException('Conversation access denied');
    }
    return member;
  }

  async createConversation(actorId: string, dto: CreateConversationDto) {
    assertNoAbusiveContent(dto.firstMessage, 'message');
    const participantIds = Array.from(new Set([actorId, ...dto.participantIds]));
    const usersCount = await this.usersRepo.count({ where: { id: In(participantIds) } });
    if (usersCount !== participantIds.length) {
      throw new NotFoundException('One or more users were not found');
    }

    const conversation = await this.conversationsRepo.save(
      this.conversationsRepo.create({
        isGroup: participantIds.length > 2,
        title: null,
      }),
    );

    await this.membersRepo.save(
      participantIds.map((userId) =>
        this.membersRepo.create({
          conversationId: conversation.id,
          userId,
        }),
      ),
    );

    const firstMessage = await this.messagesRepo.save(
      this.messagesRepo.create({
        content: dto.firstMessage.trim(),
        conversationId: conversation.id,
        senderId: actorId,
      }),
    );

    return { conversation, firstMessage };
  }

  async inbox(userId: string) {
    const memberships = await this.membersRepo.find({ where: { userId } });
    if (memberships.length === 0) {
      return [];
    }
    const conversationIds = memberships.map((item) => item.conversationId);
    const conversations = await this.conversationsRepo.find({
      where: { id: In(conversationIds) },
      order: { updatedAt: 'DESC' },
    });

    const unreadMap = new Map<string, number>();
    for (const membership of memberships) {
      const unread = await this.messagesRepo
        .createQueryBuilder('m')
        .where('m.conversation_id = :conversationId', {
          conversationId: membership.conversationId,
        })
        .andWhere('m.sender_id != :userId', { userId })
        .andWhere(
          membership.lastReadAt
            ? 'm.created_at > :lastReadAt'
            : '1 = 1',
          membership.lastReadAt ? { lastReadAt: membership.lastReadAt } : {},
        )
        .getCount();
      unreadMap.set(membership.conversationId, unread);
    }

    return conversations.map((conversation) => ({
      ...conversation,
      unreadCount: unreadMap.get(conversation.id) ?? 0,
    }));
  }

  async listMessages(conversationId: string, actorId: string) {
    await this.assertMember(conversationId, actorId);
    return this.messagesRepo.find({
      where: { conversationId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
      take: 100,
    });
  }

  async sendMessage(conversationId: string, actorId: string, dto: SendMessageDto) {
    await this.assertMember(conversationId, actorId);
    assertNoAbusiveContent(dto.content, 'message');
    const message = await this.messagesRepo.save(
      this.messagesRepo.create({
        content: dto.content.trim(),
        conversationId,
        senderId: actorId,
      }),
    );
    await this.conversationsRepo.update(conversationId, {});
    const members = await this.membersRepo.find({ where: { conversationId } });
    const recipients = members
      .map((member) => member.userId)
      .filter((memberUserId) => memberUserId !== actorId);
    await Promise.all(
      recipients.map((recipientId) =>
        this.notificationsService.createNotification({
          actorId,
          message: 'sent you a message',
          meta: { conversationId, messageId: message.id },
          recipientId,
          type: NotificationType.MESSAGE,
        }),
      ),
    );
    return message;
  }

  async markRead(conversationId: string, actorId: string) {
    const member = await this.assertMember(conversationId, actorId);
    member.lastReadAt = new Date();
    await this.membersRepo.save(member);
    return { success: true };
  }
}

