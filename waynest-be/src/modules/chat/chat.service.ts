import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, type EntityMetadata } from 'typeorm';
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
import { MediaService } from '../upload/media.service';

type ConversationMemberSummary = {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: User['role'];
};

type InboxConversationSummary = {
  id: string;
  title: string | null;
  isGroup: boolean;
  members: ConversationMemberSummary[];
  lastMessage: string | null;
  lastMessageAt: Date;
  updatedAt: Date;
  lastMessageSenderId: string | null;
  unreadCount: number;
};

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
    private readonly mediaService: MediaService,
  ) {}

  attachGateway(gateway: ChatGateway) {
    this.chatGateway = gateway;
  }

  private mapSenderForResponse(user: User) {
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: this.mediaService.publicUploadRef(user.avatarUrl),
      role: user.role,
    };
  }

  private mapMessageForResponse(message: Message, receipt: MessageReceipt | null) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      content: message.content,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      senderId: message.senderId,
      sender: message.sender ? this.mapSenderForResponse(message.sender) : undefined,
      receipt,
    };
  }

  private dedupeConversationMembers(
    members: ConversationMemberSummary[],
  ): ConversationMemberSummary[] {
    const seen = new Map<string, ConversationMemberSummary>();
    for (const member of members) {
      if (!seen.has(member.userId)) {
        seen.set(member.userId, member);
      }
    }
    return [...seen.values()];
  }

  private conversationKey(isGroup: boolean, members: ConversationMemberSummary[]) {
    const memberKey = [...new Set(members.map((member) => member.userId))]
      .sort()
      .join('|');
    return `${isGroup ? 'group' : 'direct'}:${memberKey}`;
  }

  private isNewerInboxConversation(
    next: InboxConversationSummary,
    current: InboxConversationSummary,
  ) {
    const nextLastMessageAt = new Date(next.lastMessageAt).getTime();
    const currentLastMessageAt = new Date(current.lastMessageAt).getTime();
    if (nextLastMessageAt !== currentLastMessageAt) {
      return nextLastMessageAt > currentLastMessageAt;
    }

    return new Date(next.updatedAt).getTime() > new Date(current.updatedAt).getTime();
  }

  private async findConversationByExactMembers(participantIds: string[]) {
    const row = await this.conversationsRepo
      .createQueryBuilder('conversation')
      .innerJoin(
        ConversationMember,
        'matched_member',
        'matched_member.conversationId = conversation.id AND matched_member.userId IN (:...participantIds)',
        { participantIds },
      )
      .leftJoin(
        ConversationMember,
        'all_members',
        'all_members.conversationId = conversation.id',
      )
      .select('conversation.id', 'id')
      .where('conversation.isGroup = :isGroup', { isGroup: participantIds.length > 2 })
      .groupBy('conversation.id')
      .having('COUNT(DISTINCT matched_member.userId) = :expectedCount', {
        expectedCount: participantIds.length,
      })
      .andHaving('COUNT(DISTINCT all_members.userId) = :expectedCount', {
        expectedCount: participantIds.length,
      })
      .orderBy('conversation.updatedAt', 'DESC')
      .addOrderBy('conversation.createdAt', 'DESC')
      .getRawOne<{ id: string }>();

    if (!row?.id) {
      return null;
    }

    return this.conversationsRepo.findOne({
      where: { id: row.id },
    });
  }

  private pgQuoteIdent(name: string): string {
    return `"${name.replace(/"/g, '""')}"`;
  }

  private columnName(meta: EntityMetadata, property: string): string {
    const col = meta.findColumnWithPropertyName(property);
    if (!col) {
      throw new Error(`Missing column mapping for ${property}`);
    }
    return this.pgQuoteIdent(col.databaseName);
  }

  private gw() {
    return this.chatGateway;
  }

  /** One latest message id per conversation; raw SQL avoids PG alias bugs from grouped joins. */
  private async findLatestMessageIds(conversationIds: string[]): Promise<string[]> {
    if (conversationIds.length === 0) {
      return [];
    }
    const meta = this.messagesRepo.metadata;
    const q = (name: string) => `"${name.replace(/"/g, '""')}"`;
    const table = q(meta.tableName);
    const conv = q(meta.findColumnWithPropertyName('conversationId')!.databaseName);
    const created = q(meta.findColumnWithPropertyName('createdAt')!.databaseName);
    const idCol = q(meta.findColumnWithPropertyName('id')!.databaseName);

    const sql = `
      SELECT DISTINCT ON (${conv}) ${idCol}
      FROM ${table}
      WHERE ${conv} = ANY($1)
      ORDER BY ${conv} ASC, ${created} DESC
    `;

    const rows = (await this.messagesRepo.query(sql, [conversationIds])) as Array<{
      id: string;
    }>;
    return rows.map((r) => r.id);
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

    const existingConversation = await this.findConversationByExactMembers(
      participantIds,
    );
    if (existingConversation) {
      const firstMessage = await this.sendMessage(
        existingConversation.id,
        actorId,
        { content: dto.firstMessage.trim() },
      );
      return { conversation: existingConversation, firstMessage };
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
    if (!enriched) {
      throw new NotFoundException('Message not found after create');
    }
    const messagePayload = this.mapMessageForResponse(enriched, null);
    this.gw()?.emitNewMessage(conversation.id, { message: messagePayload });

    return { conversation, firstMessage: messagePayload };
  }

  async inbox(userId: string) {
    const memberships = await this.membersRepo.find({ where: { userId } });
    if (memberships.length === 0) {
      return [];
    }
    const conversationIds = [...new Set(memberships.map((item) => item.conversationId))];
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
        avatarUrl: this.mediaService.publicUploadRef(user.avatarUrl),
        role: user.role,
      };

      const existing = membersByConversation.get(member.conversationId) ?? [];
      existing.push(nextMember);
      membersByConversation.set(member.conversationId, existing);
    });

    const latestIds = await this.findLatestMessageIds(conversationIds);
    const latestMessages =
      latestIds.length === 0
        ? []
        : await this.messagesRepo.find({
            where: { id: In(latestIds) },
          });

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

    const inboxItems: InboxConversationSummary[] = conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      isGroup: conversation.isGroup,
      members: this.dedupeConversationMembers(
        membersByConversation.get(conversation.id) ?? [],
      ),
      lastMessage: latestMessageByConversation.get(conversation.id)?.content ?? null,
      lastMessageAt:
        latestMessageByConversation.get(conversation.id)?.createdAt ??
        conversation.updatedAt,
      updatedAt: conversation.updatedAt,
      lastMessageSenderId:
        latestMessageByConversation.get(conversation.id)?.senderId ?? null,
      unreadCount: countMap.get(conversation.id) ?? 0,
    }));

    const deduped = new Map<string, InboxConversationSummary>();
    inboxItems.forEach((item) => {
      const key = this.conversationKey(item.isGroup, item.members);
      const current = deduped.get(key);
      if (!current || this.isNewerInboxConversation(item, current)) {
        deduped.set(key, item);
      }
    });

    return [...deduped.values()].sort(
      (left, right) =>
        new Date(right.lastMessageAt).getTime() -
        new Date(left.lastMessageAt).getTime(),
    );
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

    return messages.map((message) =>
      this.mapMessageForResponse(message, receiptMap.get(message.id) ?? null),
    );
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

    const messagePayload = this.mapMessageForResponse(message, null);
    this.gw()?.emitNewMessage(conversationId, { message: messagePayload });

    return messagePayload;
  }

  async markRead(conversationId: string, actorId: string) {
    const member = await this.assertMember(conversationId, actorId);
    const readAt = new Date();
    member.lastReadAt = readAt;
    await this.membersRepo.save(member);

    const mm = this.messagesRepo.metadata;
    const rm = this.receiptsRepo.metadata;
    const mt = this.pgQuoteIdent(mm.tableName);
    const rt = this.pgQuoteIdent(rm.tableName);
    const mId = this.columnName(mm, 'id');
    const mConv = this.columnName(mm, 'conversationId');
    const mSender = this.columnName(mm, 'senderId');
    const mCreated = this.columnName(mm, 'createdAt');
    const rId = this.columnName(rm, 'id');
    const rMsg = this.columnName(rm, 'messageId');
    const rUser = this.columnName(rm, 'userId');
    const rRead = this.columnName(rm, 'readAt');
    const rCreated = this.columnName(rm, 'createdAt');
    const rUpdated = this.columnName(rm, 'updatedAt');

    const sql = `
      INSERT INTO ${rt} (${rId}, ${rMsg}, ${rUser}, ${rRead}, ${rCreated}, ${rUpdated})
      SELECT gen_random_uuid(), m.${mId}, $1, $2, $2, $2
      FROM ${mt} m
      WHERE m.${mConv} = $3
        AND m.${mSender} <> $1
        AND m.${mCreated} <= $2
      ON CONFLICT (${rMsg}, ${rUser})
      DO UPDATE SET ${rRead} = EXCLUDED.${rRead}, ${rUpdated} = EXCLUDED.${rUpdated}
    `;

    await this.receiptsRepo.query(sql, [actorId, readAt, conversationId]);

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
