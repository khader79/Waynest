import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { assertNoAbusiveContent } from 'src/common/utils/contentModeration';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { Message } from './entities/message.entity';
import { MessageReceipt } from './entities/message-receipt.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import type { ChatGateway } from './chat.gateway';
import { SocialGraphService } from '../social-graph/social-graph.service';
import { FriendshipService } from '../social-graph/friendship.service';

@Injectable()
export class ChatService {
  private chatGateway: ChatGateway | null = null;

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Conversation)
    private readonly conversationsRepo: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly membersRepo: Repository<ConversationMember>,
    @InjectRepository(Message)
    private readonly messagesRepo: Repository<Message>,
    @InjectRepository(MessageReceipt)
    private readonly receiptsRepo: Repository<MessageReceipt>,
    private readonly notificationsService: NotificationsService,
    private readonly friendshipService: FriendshipService,
    private readonly socialGraphService: SocialGraphService,
  ) {}

  attachGateway(gateway: ChatGateway) {
    this.chatGateway = gateway;
  }

  private gw() {
    return this.chatGateway;
  }

  async assertMember(conversationId: string, userId: string) {
    const member = await this.membersRepo.findOne({
      where: { conversationId, userId },
    });
    if (!member) {
      throw new ForbiddenException('Conversation access denied');
    }
    return member;
  }

  async createConversation(actorId: string, dto: CreateConversationDto) {
    assertNoAbusiveContent(dto.firstMessage, 'message');
    const participantIds = Array.from(new Set([actorId, ...dto.participantIds]));
    const usersCount = await this.usersRepo.count({
      where: { id: In(participantIds) },
    });
    if (usersCount !== participantIds.length) {
      throw new NotFoundException('One or more users were not found');
    }

    const isGroupChat = participantIds.length > 2;
    const title = dto.title?.trim() || null;
    if (isGroupChat && !title) {
      throw new BadRequestException('Group conversations require a title');
    }
    if (!isGroupChat && participantIds.length === 2) {
      const peer = participantIds.find((id) => id !== actorId);
      if (peer) {
        const actor = await this.usersRepo.findOne({ where: { id: actorId } });
        const peerUser = await this.usersRepo.findOne({ where: { id: peer } });

        if (!actor || !peerUser) {
          throw new NotFoundException('Actor or peer not found');
        }

        // Rule: allow USER -> PROVIDER direct messaging if the user follows the provider.
        if (actor.role === 'USER' && peerUser.role === 'PROVIDER') {
          const graph = await this.socialGraphService.getGraphState(actorId, peer);
          if (!graph.following) {
            throw new ForbiddenException(
              'Direct messaging requires following the provider',
            );
          }
        } else if (!(await this.friendshipService.areFriends(actorId, peer))) {
          // Default: direct messaging requires accepted friend connection.
          throw new ForbiddenException(
            'Direct messaging requires an accepted friend connection',
          );
        }
      }
    }

    const conversation = await this.conversationsRepo.save(
      this.conversationsRepo.create({
        isGroup: participantIds.length > 2,
        title: isGroupChat ? title : null,
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

    const enriched = await this.messagesRepo.findOne({
      where: { id: firstMessage.id },
      relations: ['sender'],
    });

    this.gw()?.emitNewMessage(conversation.id, { message: enriched });

    return { conversation, firstMessage: enriched };
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

    const members = await this.membersRepo.find({
      where: { conversationId: In(conversationIds) },
    });

    const memberUserIds = [...new Set(members.map((member) => member.userId))];
    const users = memberUserIds.length
      ? await this.usersRepo.find({ where: { id: In(memberUserIds) } })
      : [];
    const usersById = new Map(users.map((user) => [user.id, user]));

    const membersByConversation = new Map<
      string,
      Array<{
        userId: string;
        username: string;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
        role: User['role'];
      }>
    >();

    members.forEach((member) => {
      const user = usersById.get(member.userId);
      if (!user) {
        return;
      }

      const nextMember = {
        userId: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl ?? null,
        role: user.role,
      };

      const existing = membersByConversation.get(member.conversationId) ?? [];
      existing.push(nextMember);
      membersByConversation.set(member.conversationId, existing);
    });

    const latestMessages = await this.messagesRepo
      .createQueryBuilder('msg')
      .innerJoin(
        (qb) =>
          qb
            .from(Message, 'inner_msg')
            .select('inner_msg.conversationId', 'conversationId')
            .addSelect('MAX(inner_msg.createdAt)', 'latestCreatedAt')
            .where('inner_msg.conversationId IN (:...ids)', { ids: conversationIds })
            .groupBy('inner_msg.conversationId'),
        'latest',
        'latest.conversationId = msg.conversationId AND latest.latestCreatedAt = msg.createdAt',
      )
      .where('msg.conversationId IN (:...ids)', { ids: conversationIds })
      .orderBy('msg.createdAt', 'DESC')
      .getMany();

    const latestMessageByConversation = new Map(
      latestMessages.map((message) => [message.conversationId, message]),
    );

    const rawCounts = await this.messagesRepo
      .createQueryBuilder('msg')
      .innerJoin(
        ConversationMember,
        'mem',
        'mem.conversationId = msg.conversationId AND mem.userId = :userId',
        { userId },
      )
      .select('msg.conversationId', 'conversationId')
      .addSelect('COUNT(*)', 'cnt')
      .where('msg.senderId != :userId')
      .andWhere(
        '(mem.lastReadAt IS NULL OR msg.createdAt > mem.lastReadAt)',
      )
      .andWhere('msg.conversationId IN (:...ids)', { ids: conversationIds })
      .groupBy('msg.conversationId')
      .getRawMany<{ conversationId: string; cnt: string }>();

    const countMap = new Map(
      rawCounts.map((row) => [row.conversationId, Number(row.cnt)]),
    );

    return conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      isGroup: conversation.isGroup,
      members: membersByConversation.get(conversation.id) ?? [],
      lastMessage: latestMessageByConversation.get(conversation.id)?.content ?? null,
      lastMessageAt:
        latestMessageByConversation.get(conversation.id)?.createdAt ??
        conversation.updatedAt,
      lastMessageSenderId:
        latestMessageByConversation.get(conversation.id)?.senderId ?? null,
      unreadCount: countMap.get(conversation.id) ?? 0,
    }));
  }

  async globalMessages(
    actorId: string,
    query?: ListMessagesQueryDto,
  ) {
    const memberships = await this.membersRepo.find({ where: { userId: actorId } });
    if (memberships.length === 0) {
      return [];
    }

    const conversationIds = memberships.map((item) => item.conversationId);
    const limit = query?.limit ?? 30;

    const qb = this.messagesRepo
      .createQueryBuilder('m')
      .where('m.conversationId IN (:...ids)', { ids: conversationIds })
      .orderBy('m.createdAt', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .take(limit);

    if (query?.before) {
      const pivot = await this.messagesRepo.findOne({
        where: { id: query.before },
      });

      if (pivot) {
        qb.andWhere(
          '(m.createdAt < :t OR (m.createdAt = :t AND m.id < :id))',
          { t: pivot.createdAt, id: pivot.id },
        );
      }
    }

    const messages = await qb.getMany();
    if (messages.length === 0) {
      return [];
    }

    const messageIds = messages.map((m) => m.id);
    const receipts = await this.receiptsRepo.find({
      where: { userId: actorId, messageId: In(messageIds) },
    });
    const receiptMap = new Map(receipts.map((r) => [r.messageId, r]));

    return messages.map((message) => ({
      id: message.id,
      conversationId: message.conversationId,
      content: message.content,
      createdAt: message.createdAt,
      senderId: message.senderId,
      receipt: receiptMap.get(message.id) ?? null,
    }));
  }

  async listMessages(
    conversationId: string,
    actorId: string,
    query?: ListMessagesQueryDto,
  ) {
    await this.assertMember(conversationId, actorId);
    const limit = query?.limit ?? 50;
    const qb = this.messagesRepo
      .createQueryBuilder('m')
      .where('m.conversationId = :conversationId', { conversationId })
      .leftJoinAndSelect('m.sender', 'sender')
      .orderBy('m.createdAt', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .take(limit);

    if (query?.before) {
      const pivot = await this.messagesRepo.findOne({
        where: { id: query.before, conversationId },
      });
      if (pivot) {
        qb.andWhere(
          '(m.createdAt < :t OR (m.createdAt = :t AND m.id < :id))',
          {
            t: pivot.createdAt,
            id: pivot.id,
          },
        );
      }
    }

    const messages = await qb.getMany();
    messages.reverse();

    if (messages.length === 0) {
      return [];
    }

    const messageIds = messages.map((m) => m.id);
    const receipts = await this.receiptsRepo.find({
      where: { userId: actorId, messageId: In(messageIds) },
    });
    const receiptMap = new Map(receipts.map((r) => [r.messageId, r]));

    return messages.map((message) => ({
      ...message,
      receipt: receiptMap.get(message.id) ?? null,
    }));
  }

  async sendMessage(
    conversationId: string,
    actorId: string,
    dto: SendMessageDto,
  ) {
    await this.assertMember(conversationId, actorId);
    assertNoAbusiveContent(dto.content, 'message');
    const saved = await this.messagesRepo.save(
      this.messagesRepo.create({
        content: dto.content.trim(),
        conversationId,
        senderId: actorId,
      }),
    );
    await this.conversationsRepo.update(conversationId, {});

    const message = await this.messagesRepo.findOne({
      where: { id: saved.id },
      relations: ['sender'],
    });

    if (!message) {
      throw new NotFoundException('Message not found after send');
    }

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

    this.gw()?.emitNewMessage(conversationId, { message });

    return message;
  }

  async markRead(conversationId: string, actorId: string) {
    const member = await this.assertMember(conversationId, actorId);
    const readAt = new Date();
    member.lastReadAt = readAt;
    await this.membersRepo.save(member);

    await this.receiptsRepo.query(
      `INSERT INTO message_receipts (id, message_id, user_id, read_at, created_at, updated_at)
       SELECT gen_random_uuid(), m.id, $1, $2, $2, $2
       FROM messages m
       WHERE m.conversation_id = $3
         AND m.sender_id <> $1
         AND m.created_at <= $2
       ON CONFLICT (message_id, user_id)
       DO UPDATE SET read_at = EXCLUDED.read_at, updated_at = EXCLUDED.updated_at`,
      [actorId, readAt, conversationId],
    );

    this.gw()?.emitConversationRead(conversationId, {
      userId: actorId,
      readAt: readAt.toISOString(),
    });

    return { success: true };
  }

  async updateConversation(
    conversationId: string,
    actorId: string,
    dto: UpdateConversationDto,
  ) {
    await this.assertMember(conversationId, actorId);

    const conversation = await this.conversationsRepo.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation.isGroup) {
      throw new BadRequestException('Only group conversations can be updated');
    }

    if (typeof dto.title === 'string') {
      conversation.title = dto.title.trim() || null;
    }

    if (!conversation.title) {
      throw new BadRequestException('Group conversations require a title');
    }

    return this.conversationsRepo.save(conversation);
  }

  async markDelivered(
    conversationId: string,
    messageId: string,
    actorId: string,
  ) {
    await this.assertMember(conversationId, actorId);
    const message = await this.messagesRepo.findOne({
      where: { id: messageId, conversationId },
    });
    if (!message || message.senderId === actorId) {
      return { success: true };
    }

    let receipt = await this.receiptsRepo.findOne({
      where: { messageId, userId: actorId },
    });
    const now = new Date();
    if (!receipt) {
      receipt = this.receiptsRepo.create({
        messageId,
        userId: actorId,
        deliveredAt: now,
        readAt: null,
      });
    } else if (!receipt.deliveredAt) {
      receipt.deliveredAt = now;
    }
    await this.receiptsRepo.save(receipt);

    this.gw()?.emitMessageStatus(conversationId, {
      messageId,
      userId: actorId,
      status: 'delivered',
      at: now.toISOString(),
    });

    return { success: true };
  }
}
