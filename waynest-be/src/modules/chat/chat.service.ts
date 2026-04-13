import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
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
import { MessageReaction } from './entities/message-reaction.entity';
import { MessageReceipt } from './entities/message-receipt.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { AddConversationMembersDto } from './dto/add-conversation-members.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageReactionDto } from './dto/message-reaction.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ConversationStateDto } from './dto/conversation-state.dto';
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

type MessageReactionSummary = {
  emoji: string;
  userId: string;
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
  pinnedAt: Date | null;
  mutedAt: Date | null;
  archivedAt: Date | null;
};

type ConversationMemberRow = {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: User['role'];
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private chatGateway: ChatGateway | null = null;

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Conversation)
    private readonly conversationsRepo: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly membersRepo: Repository<ConversationMember>,
    @InjectRepository(Message)
    private readonly messagesRepo: Repository<Message>,
    @InjectRepository(MessageReaction)
    private readonly reactionsRepo: Repository<MessageReaction>,
    @InjectRepository(MessageReceipt)
    private readonly receiptsRepo: Repository<MessageReceipt>,
    private readonly notificationsService: NotificationsService,
    private readonly friendshipService: FriendshipService,
    private readonly socialGraphService: SocialGraphService,
    private readonly mediaService: MediaService,
  ) {}

  private queueNotification(
    input: Parameters<NotificationsService['createNotification']>[0],
  ) {
    void this.notificationsService
      .createNotification(input)
      .catch(() => undefined);
  }

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

  private mapMessageForResponse(
    message: Message,
    receipt: MessageReceipt | null,
    reactions: MessageReactionSummary[] = [],
  ) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      content: message.content,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      senderId: message.senderId,
      replyToId: message.replyToMessageId ?? null,
      editedAt: message.editedAt ?? null,
      deletedAt: message.deletedAt ?? null,
      sender: message.sender
        ? this.mapSenderForResponse(message.sender)
        : undefined,
      receipt,
      reactions,
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

  private conversationKey(
    isGroup: boolean,
    members: ConversationMemberSummary[],
  ) {
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

    return (
      new Date(next.updatedAt).getTime() > new Date(current.updatedAt).getTime()
    );
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
      .where('conversation.isGroup = :isGroup', {
        isGroup: participantIds.length > 2,
      })
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

  private logTiming(
    label: string,
    startedAt: number,
    meta?: Record<string, string | number | undefined>,
  ) {
    const elapsedMs = Date.now() - startedAt;
    this.logger.debug(
      `${label} took ${elapsedMs}ms ${JSON.stringify({ elapsedMs, ...meta })}`,
    );
  }

  private async loadReactionsByMessageIds(messageIds: string[]) {
    if (messageIds.length === 0) {
      return new Map<string, MessageReactionSummary[]>();
    }

    const reactions = await this.reactionsRepo.find({
      where: { messageId: In(messageIds) },
      order: { createdAt: 'ASC' },
    });

    const byMessage = new Map<string, MessageReactionSummary[]>();
    reactions.forEach((reaction) => {
      const current = byMessage.get(reaction.messageId) ?? [];
      current.push({
        emoji: reaction.emoji,
        userId: reaction.userId,
      });
      byMessage.set(reaction.messageId, current);
    });
    return byMessage;
  }

  private async hydrateMessages(messages: Message[], actorId: string) {
    if (messages.length === 0) {
      return [];
    }

    const messageIds = messages.map((message) => message.id);
    const receipts = await this.receiptsRepo.find({
      where: { userId: actorId, messageId: In(messageIds) },
    });
    const receiptMap = new Map(receipts.map((r) => [r.messageId, r]));
    const reactionsMap = await this.loadReactionsByMessageIds(messageIds);

    return messages.map((message) =>
      this.mapMessageForResponse(
        message,
        receiptMap.get(message.id) ?? null,
        reactionsMap.get(message.id) ?? [],
      ),
    );
  }

  private async buildConversationSummary(
    conversationId: string,
  ): Promise<InboxConversationSummary | null> {
    const [conversation, members, latestIds] = await Promise.all([
      this.conversationsRepo.findOne({
        where: { id: conversationId },
        select: {
          id: true,
          title: true,
          isGroup: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
      this.membersRepo.find({
        where: { conversationId },
        select: { conversationId: true, userId: true },
      }),
      this.findLatestMessageIds([conversationId]),
    ]);
    if (!conversation) {
      return null;
    }

    const memberUserIds = [...new Set(members.map((member) => member.userId))];
    const users = memberUserIds.length
      ? await this.usersRepo.find({
          where: { id: In(memberUserIds) },
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        })
      : [];
    const usersById = new Map(users.map((user) => [user.id, user]));
    const memberSummaries: ConversationMemberRow[] = members
      .map((member) => {
        const user = usersById.get(member.userId);
        if (!user) {
          return null;
        }
        return {
          userId: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: this.mediaService.publicUploadRef(user.avatarUrl),
          role: user.role,
        };
      })
      .filter((member): member is ConversationMemberRow => Boolean(member));

    const latestMessage =
      latestIds.length > 0
        ? await this.messagesRepo.findOne({
            where: { id: latestIds[0] },
          })
        : null;

    return {
      id: conversation.id,
      title: conversation.title,
      isGroup: conversation.isGroup,
      members: this.dedupeConversationMembers(memberSummaries),
      lastMessage: latestMessage?.content ?? null,
      lastMessageAt: latestMessage?.createdAt ?? conversation.updatedAt,
      updatedAt: conversation.updatedAt,
      lastMessageSenderId: latestMessage?.senderId ?? null,
      unreadCount: 0,
      pinnedAt: null,
      mutedAt: null,
      archivedAt: null,
    };
  }

  private async emitConversationUpsert(
    conversationId: string,
    recipientIds: string[],
  ) {
    const summary = await this.buildConversationSummary(conversationId);
    if (!summary) {
      return;
    }

    this.gw()?.emitConversationUpsert(summary, recipientIds);
  }

  private async findLatestMessageIds(
    conversationIds: string[],
  ): Promise<string[]> {
    if (conversationIds.length === 0) {
      return [];
    }
    const meta = this.messagesRepo.metadata;
    const q = (name: string) => `"${name.replace(/"/g, '""')}"`;
    const table = q(meta.tableName);
    const conv = q(
      meta.findColumnWithPropertyName('conversationId')!.databaseName,
    );
    const created = q(
      meta.findColumnWithPropertyName('createdAt')!.databaseName,
    );
    const idCol = q(meta.findColumnWithPropertyName('id')!.databaseName);
    const deletedAtColumn = meta.findColumnWithPropertyName('deletedAt');
    const deletedClause = deletedAtColumn
      ? `AND ${q(deletedAtColumn.databaseName)} IS NULL`
      : '';

    const sql = `
      SELECT DISTINCT ON (${conv}) ${idCol}
      FROM ${table}
      WHERE ${conv} = ANY($1)
      ${deletedClause}
      ORDER BY ${conv} ASC, ${created} DESC
    `;

    const rows = await this.messagesRepo.query(sql, [conversationIds]);
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
    const participantIds = Array.from(
      new Set([actorId, ...dto.participantIds]),
    );
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

        if (actor.role === 'USER' && peerUser.role === 'PROVIDER') {
          const graph = await this.socialGraphService.getGraphState(
            actorId,
            peer,
          );
          if (!graph.following) {
            throw new ForbiddenException(
              'Direct messaging requires following the provider',
            );
          }
        } else if (!(await this.friendshipService.areFriends(actorId, peer))) {
          throw new ForbiddenException(
            'Direct messaging requires an accepted friend connection',
          );
        }
      }
    }

    const existingConversation =
      await this.findConversationByExactMembers(participantIds);
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
    this.gw()?.emitNewMessage(conversation.id, participantIds, {
      message: messagePayload,
    });
    void this.emitConversationUpsert(conversation.id, participantIds);

    return { conversation, firstMessage: messagePayload };
  }

  async inbox(userId: string) {
    const startedAt = Date.now();
    const memberships = await this.membersRepo.find({
      where: { userId },
      select: {
        conversationId: true,
        userId: true,
        pinnedAt: true,
        mutedAt: true,
        archivedAt: true,
      },
    });
    if (memberships.length === 0) {
      return [];
    }
    const conversationIds = [
      ...new Set(memberships.map((item) => item.conversationId)),
    ];
    const membershipStateByConversation = new Map(
      memberships.map((membership) => [
        membership.conversationId,
        {
          pinnedAt: membership.pinnedAt,
          mutedAt: membership.mutedAt,
          archivedAt: membership.archivedAt,
        },
      ]),
    );
    const conversations = await this.conversationsRepo.find({
      where: { id: In(conversationIds) },
      order: { updatedAt: 'DESC' },
      select: {
        id: true,
        title: true,
        isGroup: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    const [members, latestIds, rawCounts] = await Promise.all([
      this.membersRepo.find({
        where: { conversationId: In(conversationIds) },
        select: { conversationId: true, userId: true },
      }),
      this.findLatestMessageIds(conversationIds),
      this.messagesRepo
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
        .andWhere('(mem.lastReadAt IS NULL OR msg.createdAt > mem.lastReadAt)')
        .andWhere('msg.conversationId IN (:...ids)', { ids: conversationIds })
        .groupBy('msg.conversationId')
        .getRawMany<{ conversationId: string; cnt: string }>(),
    ]);

    const memberUserIds = [...new Set(members.map((member) => member.userId))];
    const users = memberUserIds.length
      ? await this.usersRepo.find({
          where: { id: In(memberUserIds) },
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        })
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

    const latestMessages =
      latestIds.length === 0
        ? []
        : await this.messagesRepo.find({
            where: { id: In(latestIds) },
          });

    const latestMessageByConversation = new Map(
      latestMessages.map((message) => [message.conversationId, message]),
    );

    const countMap = new Map(
      rawCounts.map((row) => [row.conversationId, Number(row.cnt)]),
    );

    const inboxItems: InboxConversationSummary[] = conversations.map(
      (conversation) => ({
        id: conversation.id,
        title: conversation.title,
        isGroup: conversation.isGroup,
        members: this.dedupeConversationMembers(
          membersByConversation.get(conversation.id) ?? [],
        ),
        lastMessage:
          latestMessageByConversation.get(conversation.id)?.content ?? null,
        lastMessageAt:
          latestMessageByConversation.get(conversation.id)?.createdAt ??
          conversation.updatedAt,
        updatedAt: conversation.updatedAt,
        lastMessageSenderId:
          latestMessageByConversation.get(conversation.id)?.senderId ?? null,
        unreadCount: countMap.get(conversation.id) ?? 0,
        pinnedAt:
          membershipStateByConversation.get(conversation.id)?.pinnedAt ?? null,
        mutedAt:
          membershipStateByConversation.get(conversation.id)?.mutedAt ?? null,
        archivedAt:
          membershipStateByConversation.get(conversation.id)?.archivedAt ??
          null,
      }),
    );

    const deduped = new Map<string, InboxConversationSummary>();
    inboxItems.forEach((item) => {
      const key = this.conversationKey(item.isGroup, item.members);
      const current = deduped.get(key);
      if (!current || this.isNewerInboxConversation(item, current)) {
        deduped.set(key, item);
      }
    });

    const items = [...deduped.values()].sort(
      (left, right) =>
        new Date(right.lastMessageAt).getTime() -
        new Date(left.lastMessageAt).getTime(),
    );
    this.logTiming('inbox', startedAt, {
      userId,
      conversations: items.length,
    });
    return items;
  }

  async globalMessages(actorId: string, query?: ListMessagesQueryDto) {
    const startedAt = Date.now();
    const memberships = await this.membersRepo.find({
      where: { userId: actorId },
      select: { conversationId: true, userId: true },
    });
    if (memberships.length === 0) {
      return [];
    }

    const conversationIds = memberships.map((item) => item.conversationId);
    const limit = query?.limit ?? 20;

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
        qb.andWhere('(m.createdAt < :t OR (m.createdAt = :t AND m.id < :id))', {
          t: pivot.createdAt,
          id: pivot.id,
        });
      }
    }

    const messages = await qb.getMany();
    if (messages.length === 0) {
      return [];
    }

    const result = await this.hydrateMessages(messages, actorId);

    this.logTiming('globalMessages', startedAt, {
      actorId,
      returned: result.length,
    });

    return result;
  }

  async listMessages(
    conversationId: string,
    actorId: string,
    query?: ListMessagesQueryDto,
  ) {
    const startedAt = Date.now();
    await this.assertMember(conversationId, actorId);
    const limit = query?.limit ?? 20;
    let pivot: Message | null = null;
    if (query?.before) {
      pivot = await this.messagesRepo.findOne({
        where: { id: query.before, conversationId },
      });
    }

    const idQb = this.messagesRepo
      .createQueryBuilder('m')
      .select('m.id', 'id')
      .where('m.conversationId = :conversationId', { conversationId })
      .orderBy('m.createdAt', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .take(limit);

    if (pivot) {
      idQb.andWhere('(m.createdAt < :t OR (m.createdAt = :t AND m.id < :id))', {
        t: pivot.createdAt,
        id: pivot.id,
      });
    }

    const idRows = await idQb.getRawMany();
    const ids = idRows.map((r: any) => r.id).filter(Boolean);
    if (ids.length === 0) return [];

    const messages = await this.messagesRepo.find({
      where: { id: In(ids) },
      relations: ['sender'],
      order: { createdAt: 'ASC', id: 'ASC' },
    });

    const result = await this.hydrateMessages(messages, actorId);
    this.logTiming('listMessages', startedAt, {
      actorId,
      conversationId,
      limit,
      returned: result.length,
    });
    return result;
  }

  async sendMessage(
    conversationId: string,
    actorId: string,
    dto: SendMessageDto,
  ) {
    const startedAt = Date.now();
    await this.assertMember(conversationId, actorId);
    assertNoAbusiveContent(dto.content, 'message');

    let replyToMessageId: string | null = null;
    if (dto.replyToMessageId) {
      const replyToMessage = await this.messagesRepo.findOne({
        where: { id: dto.replyToMessageId, conversationId },
      });
      if (!replyToMessage) {
        throw new NotFoundException('Reply target was not found');
      }
      replyToMessageId = replyToMessage.id;
    }

    const saved = await this.messagesRepo.save(
      this.messagesRepo.create({
        content: dto.content.trim(),
        conversationId,
        senderId: actorId,
        replyToMessageId,
      }),
    );

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
    for (const recipientId of recipients) {
      this.queueNotification({
        actorId,
        message: 'sent you a message',
        meta: { conversationId, messageId: message.id },
        recipientId,
        type: NotificationType.MESSAGE,
      });
    }

    const messagePayload = (await this.hydrateMessages([message], actorId))[0];
    this.gw()?.emitNewMessage(
      conversationId,
      members.map((member) => member.userId),
      {
        message: messagePayload,
      },
    );

    this.logTiming('sendMessage', startedAt, {
      actorId,
      conversationId,
      messageId: message.id,
      recipients: recipients.length,
    });

    return messagePayload;
  }

  async markRead(conversationId: string, actorId: string) {
    const startedAt = Date.now();
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

    const otherMembers = await this.membersRepo.find({
      where: { conversationId },
      select: { userId: true },
    });

    this.gw()?.emitConversationRead(
      conversationId,
      {
        conversationId,
        userId: actorId,
        readAt: readAt.toISOString(),
      },
      otherMembers
        .map((entry) => entry.userId)
        .filter((userId) => userId !== actorId),
    );

    this.logTiming('markRead', startedAt, {
      actorId,
      conversationId,
    });

    return { success: true };
  }

  async updateConversation(
    conversationId: string,
    actorId: string,
    dto: UpdateConversationDto,
  ) {
    const startedAt = Date.now();
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

    const result = await this.conversationsRepo.save(conversation);
    const memberIds = (
      await this.membersRepo.find({
        where: { conversationId },
        select: { userId: true },
      })
    ).map((member) => member.userId);
    void this.emitConversationUpsert(conversationId, memberIds);
    this.logTiming('updateConversation', startedAt, {
      actorId,
      conversationId,
    });
    return result;
  }

  async addConversationMembers(
    conversationId: string,
    actorId: string,
    dto: AddConversationMembersDto,
  ) {
    const startedAt = Date.now();
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

    const existingMembers = await this.membersRepo.find({
      where: { conversationId },
    });
    const existingIds = new Set(existingMembers.map((member) => member.userId));
    const userIdsToAdd = Array.from(new Set(dto.userIds))
      .filter((userId) => userId !== actorId)
      .filter((userId) => !existingIds.has(userId));

    if (userIdsToAdd.length === 0) {
      return { success: true, addedCount: 0 };
    }

    const foundCount = await this.usersRepo.count({
      where: { id: In(userIdsToAdd) },
    });
    if (foundCount !== userIdsToAdd.length) {
      throw new NotFoundException('One or more users were not found');
    }

    await this.membersRepo.save(
      userIdsToAdd.map((userId) =>
        this.membersRepo.create({
          conversationId,
          userId,
        }),
      ),
    );

    await this.conversationsRepo.update(conversationId, {
      updatedAt: new Date(),
    });

    const allMemberIds = [
      ...new Set([...existingIds, actorId, ...userIdsToAdd]),
    ];
    void this.emitConversationUpsert(conversationId, allMemberIds);

    this.logTiming('addConversationMembers', startedAt, {
      actorId,
      conversationId,
      addedCount: userIdsToAdd.length,
    });

    return { success: true, addedCount: userIdsToAdd.length };
  }

  async removeConversationMember(
    conversationId: string,
    actorId: string,
    targetUserId: string,
  ) {
    const startedAt = Date.now();
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

    if (targetUserId === actorId) {
      throw new BadRequestException('Use a dedicated leave flow to exit a group');
    }

    const members = await this.membersRepo.find({ where: { conversationId } });
    const memberToRemove = members.find((member) => member.userId === targetUserId);
    if (!memberToRemove) {
      throw new NotFoundException('Conversation member not found');
    }

    if (members.length <= 2) {
      throw new BadRequestException(
        'Cannot remove members when only two participants remain',
      );
    }

    await this.membersRepo.delete({
      conversationId,
      userId: targetUserId,
    });

    await this.conversationsRepo.update(conversationId, {
      updatedAt: new Date(),
    });

    const remainingMemberIds = members
      .map((member) => member.userId)
      .filter((userId) => userId !== targetUserId);
    void this.emitConversationUpsert(conversationId, remainingMemberIds);

    this.logTiming('removeConversationMember', startedAt, {
      actorId,
      conversationId,
      targetUserId,
    });

    return {
      success: true,
      removedUserId: targetUserId,
    };
  }

  async markDelivered(
    conversationId: string,
    messageId: string,
    actorId: string,
  ) {
    const startedAt = Date.now();
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
      senderId: message.senderId,
    });

    this.logTiming('markDelivered', startedAt, {
      actorId,
      conversationId,
      messageId,
    });

    return { success: true };
  }

  private async updateConversationMemberState(
    conversationId: string,
    actorId: string,
    patch: Partial<
      Pick<ConversationMember, 'pinnedAt' | 'mutedAt' | 'archivedAt'>
    >,
  ) {
    const member = await this.assertMember(conversationId, actorId);
    Object.assign(member, patch);
    await this.membersRepo.save(member);
    return member;
  }

  async pinConversation(conversationId: string, actorId: string) {
    await this.updateConversationMemberState(conversationId, actorId, {
      pinnedAt: new Date(),
    });
    return { pinned: true };
  }

  async unpinConversation(conversationId: string, actorId: string) {
    await this.updateConversationMemberState(conversationId, actorId, {
      pinnedAt: null,
    });
    return { pinned: false };
  }

  async muteConversation(conversationId: string, actorId: string) {
    await this.updateConversationMemberState(conversationId, actorId, {
      mutedAt: new Date(),
    });
    return { muted: true };
  }

  async unmuteConversation(conversationId: string, actorId: string) {
    await this.updateConversationMemberState(conversationId, actorId, {
      mutedAt: null,
    });
    return { muted: false };
  }

  async archiveConversation(conversationId: string, actorId: string) {
    await this.updateConversationMemberState(conversationId, actorId, {
      archivedAt: new Date(),
    });
    return { archived: true };
  }

  async unarchiveConversation(conversationId: string, actorId: string) {
    await this.updateConversationMemberState(conversationId, actorId, {
      archivedAt: null,
    });
    return { archived: false };
  }

  async editMessage(
    conversationId: string,
    messageId: string,
    actorId: string,
    dto: UpdateMessageDto,
  ) {
    const startedAt = Date.now();
    await this.assertMember(conversationId, actorId);
    assertNoAbusiveContent(dto.content, 'message');

    const message = await this.messagesRepo.findOne({
      where: { id: messageId, conversationId },
      relations: ['sender'],
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.senderId !== actorId) {
      throw new ForbiddenException('You can only edit your own messages');
    }
    if (message.deletedAt) {
      throw new BadRequestException('Deleted messages cannot be edited');
    }

    message.content = dto.content.trim();
    message.editedAt = new Date();
    await this.messagesRepo.save(message);

    const response = (await this.hydrateMessages([message], actorId))[0];
    const members = await this.membersRepo.find({
      where: { conversationId },
      select: { userId: true },
    });
    this.gw()?.emitMessageEdited(
      conversationId,
      {
        conversationId,
        messageId,
        userId: actorId,
        message: response as Record<string, unknown>,
        editedAt: message.editedAt.toISOString(),
      },
      members.map((item) => item.userId),
    );
    void this.emitConversationUpsert(
      conversationId,
      members.map((item) => item.userId),
    );
    this.logTiming('editMessage', startedAt, {
      actorId,
      conversationId,
      messageId,
    });
    return response;
  }

  async deleteMessage(
    conversationId: string,
    messageId: string,
    actorId: string,
  ) {
    const startedAt = Date.now();
    await this.assertMember(conversationId, actorId);
    const message = await this.messagesRepo.findOne({
      where: { id: messageId, conversationId },
      relations: ['sender'],
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.senderId !== actorId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.messagesRepo.softDelete({ id: messageId, conversationId });
    const members = await this.membersRepo.find({
      where: { conversationId },
      select: { userId: true },
    });
    this.gw()?.emitMessageDeleted(
      conversationId,
      {
        messageId,
        conversationId,
        userId: actorId,
        deletedAt: new Date().toISOString(),
      },
      members.map((item) => item.userId),
    );
    void this.emitConversationUpsert(
      conversationId,
      members.map((item) => item.userId),
    );
    this.logTiming('deleteMessage', startedAt, {
      actorId,
      conversationId,
      messageId,
    });
    return { deleted: true };
  }

  async toggleMessageReaction(
    conversationId: string,
    messageId: string,
    actorId: string,
    dto: MessageReactionDto,
  ) {
    const startedAt = Date.now();
    await this.assertMember(conversationId, actorId);
    const message = await this.messagesRepo.findOne({
      where: { id: messageId, conversationId },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const emoji = dto.emoji.trim();
    if (!emoji) {
      throw new BadRequestException('Reaction emoji is required');
    }

    const existing = await this.reactionsRepo.findOne({
      where: { messageId, userId: actorId },
    });
    if (existing && existing.emoji === emoji) {
      await this.reactionsRepo.delete({ id: existing.id });
    } else if (existing) {
      existing.emoji = emoji;
      await this.reactionsRepo.save(existing);
    } else {
      await this.reactionsRepo.save(
        this.reactionsRepo.create({ messageId, userId: actorId, emoji }),
      );
    }

    const reactions = await this.loadReactionsByMessageIds([messageId]);
    const members = await this.membersRepo.find({
      where: { conversationId },
      select: { userId: true },
    });
    const payload = {
      conversationId,
      messageId,
      userId: actorId,
      reactions: reactions.get(messageId) ?? [],
      updatedAt: new Date().toISOString(),
    };
    this.gw()?.emitReactionUpdate(
      conversationId,
      payload,
      members.map((item) => item.userId),
    );
    this.logTiming('toggleMessageReaction', startedAt, {
      actorId,
      conversationId,
      messageId,
    });
    return payload;
  }
}
