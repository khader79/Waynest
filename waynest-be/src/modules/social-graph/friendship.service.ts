import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Friendship, FriendshipStatus } from './entities/friendship.entity';
import { MediaService } from '../upload/media.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

export type FriendshipState =
  | 'NONE'
  | 'PENDING_OUTGOING'
  | 'PENDING_INCOMING'
  | 'ACCEPTED'
  | 'DECLINED';

function orderedPair(a: string, b: string): { low: string; high: string } {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

@Injectable()
export class FriendshipService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Friendship)
    private readonly friendshipRepo: Repository<Friendship>,
    private readonly mediaService: MediaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private queueNotification(
    input: Parameters<NotificationsService['createNotification']>[0],
  ) {
    if (
      !this.notificationsService ||
      typeof this.notificationsService.createNotification !== 'function'
    ) {
      return;
    }
    try {
      const res = this.notificationsService.createNotification(input);
      void Promise.resolve(res).catch(() => undefined);
    } catch {
      // swallow sync errors from optional notification implementation
    }
  }

  async findUserByUsername(username: string) {
    const normalized = username.trim();
    const user = await this.usersRepo.findOne({
      where: { username: normalized },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findUserByUsernameOrId(param: string) {
    const trimmed = param.trim();
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRe.test(trimmed)) {
      const byId = await this.usersRepo.findOne({ where: { id: trimmed } });
      if (byId) {
        return byId;
      }
    }
    return this.findUserByUsername(trimmed);
  }

  private async getRow(a: string, b: string) {
    const { low, high } = orderedPair(a, b);
    return this.friendshipRepo.findOne({
      where: { userLowId: low, userHighId: high },
    });
  }

  async areFriends(userA: string, userB: string): Promise<boolean> {
    if (userA === userB) {
      return false;
    }
    const row = await this.getRow(userA, userB);
    return Boolean(row && row.status === FriendshipStatus.ACCEPTED);
  }

  async getState(
    actorId: string,
    targetUserId: string,
  ): Promise<{
    state: FriendshipState;
    requesterId?: string;
  }> {
    if (actorId === targetUserId) {
      return { state: 'NONE' };
    }
    const row = await this.getRow(actorId, targetUserId);
    if (!row) {
      return { state: 'NONE' };
    }
    if (row.status === FriendshipStatus.ACCEPTED) {
      return { state: 'ACCEPTED', requesterId: row.requesterId };
    }
    if (row.status === FriendshipStatus.DECLINED) {
      return { state: 'DECLINED', requesterId: row.requesterId };
    }
    if (row.requesterId === actorId) {
      return { state: 'PENDING_OUTGOING', requesterId: row.requesterId };
    }
    return { state: 'PENDING_INCOMING', requesterId: row.requesterId };
  }

  async requestByUsername(actorId: string, targetUsername: string) {
    const target = await this.findUserByUsername(targetUsername);
    // Do not allow sending friend requests to provider accounts
    if (target.role === UserRole.PROVIDER) {
      throw new BadRequestException('Cannot send friend requests to providers');
    }
    if (target.id === actorId) {
      throw new BadRequestException('Cannot friend yourself');
    }
    const { low, high } = orderedPair(actorId, target.id);
    let row = await this.friendshipRepo.findOne({
      where: { userLowId: low, userHighId: high },
    });

    if (row?.status === FriendshipStatus.ACCEPTED) {
      return { status: 'ACCEPTED' as const };
    }

    if (row?.status === FriendshipStatus.PENDING) {
      if (row.requesterId === actorId) {
        return { status: 'PENDING' as const };
      }
      throw new BadRequestException(
        'This user already sent you a request. Accept it instead.',
      );
    }

    if (row?.status === FriendshipStatus.DECLINED) {
      row.requesterId = actorId;
      row.status = FriendshipStatus.PENDING;
      await this.friendshipRepo.save(row);
      this.queueNotification({
        actorId,
        recipientId: target.id,
        type: NotificationType.FRIEND_REQUEST,
        message: 'sent you a friend request',
        meta: {},
      });
      return { status: 'PENDING' as const };
    }

    row = this.friendshipRepo.create({
      requesterId: actorId,
      status: FriendshipStatus.PENDING,
      userHighId: high,
      userLowId: low,
    });
    await this.friendshipRepo.insert(row);
    this.queueNotification({
      actorId,
      recipientId: target.id,
      type: NotificationType.FRIEND_REQUEST,
      message: 'sent you a friend request',
      meta: {},
    });
    return { status: 'PENDING' as const };
  }

  async accept(actorId: string, requesterId: string) {
    if (actorId === requesterId) {
      throw new BadRequestException('Invalid accept target');
    }
    const { low, high } = orderedPair(actorId, requesterId);
    const row = await this.friendshipRepo.findOne({
      where: { userLowId: low, userHighId: high },
    });
    if (!row || row.status !== FriendshipStatus.PENDING) {
      throw new NotFoundException('No pending request');
    }
    if (row.requesterId !== requesterId || actorId === requesterId) {
      throw new ForbiddenException('You cannot accept this request');
    }
    row.status = FriendshipStatus.ACCEPTED;
    await this.friendshipRepo.save(row);
    this.queueNotification({
      actorId,
      recipientId: requesterId,
      type: NotificationType.FRIEND_ACCEPTED,
      message: 'accepted your friend request',
      meta: {},
    });
    return { status: 'ACCEPTED' as const };
  }

  async decline(actorId: string, requesterId: string) {
    if (actorId === requesterId) {
      throw new BadRequestException('Invalid decline target');
    }
    const { low, high } = orderedPair(actorId, requesterId);
    const row = await this.friendshipRepo.findOne({
      where: { userLowId: low, userHighId: high },
    });
    if (!row || row.status !== FriendshipStatus.PENDING) {
      return { status: 'DECLINED' as const };
    }
    if (row.requesterId !== requesterId) {
      throw new ForbiddenException('Not your incoming request');
    }
    row.status = FriendshipStatus.DECLINED;
    await this.friendshipRepo.save(row);
    return { status: 'DECLINED' as const };
  }

  async listIncoming(actorId: string) {
    const incoming = await this.friendshipRepo
      .createQueryBuilder('f')
      .where('f.status = :status', { status: FriendshipStatus.PENDING })
      .andWhere('(f.userLowId = :actorId OR f.userHighId = :actorId)', {
        actorId,
      })
      .andWhere('f.requesterId != :actorId', { actorId })
      .orderBy('f.createdAt', 'DESC')
      .getMany();

    const userIds = [...new Set(incoming.map((r) => r.requesterId))];
    if (userIds.length === 0) {
      return [];
    }
    const users = await this.usersRepo.find({ where: { id: In(userIds) } });
    const byId = new Map(users.map((u) => [u.id, u]));
    return incoming.map((row) => {
      const u = byId.get(row.requesterId);
      return {
        requesterId: row.requesterId,
        username: u?.username ?? '',
        firstName: u?.firstName ?? '',
        lastName: u?.lastName ?? '',
        avatarUrl: this.mediaService.publicUploadRef(u?.avatarUrl),
        requestedAt: row.createdAt,
      };
    });
  }

  async countAcceptedFriends(userId: string): Promise<number> {
    const count = await this.friendshipRepo
      .createQueryBuilder('f')
      .where('f.status = :status', { status: FriendshipStatus.ACCEPTED })
      .andWhere('(f.userLowId = :uid OR f.userHighId = :uid)', { uid: userId })
      .getCount();

    if (process.env.DEBUG_FRIENDS === 'true') {
      try {
        const rows = await this.friendshipRepo
          .createQueryBuilder('f')
          .where('f.status = :status', { status: FriendshipStatus.ACCEPTED })
          .andWhere('(f.userLowId = :uid OR f.userHighId = :uid)', { uid: userId })
          .getMany();
        // Output a compact sample of rows for debugging
        // eslint-disable-next-line no-console
        console.log(
          `[DEBUG] friendship.countAcceptedFriends user=${userId} count=${count} sample=${JSON.stringify(
            rows.slice(0, 5).map((r) => ({ id: r.id, userLowId: r.userLowId, userHighId: r.userHighId }))
          )}`,
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log('[DEBUG] friendship.countAcceptedFriends error fetching rows', err);
      }
    }

    return count;
  }

  async listFriends(actorId: string, search?: string) {
    const friendRows = await this.friendshipRepo
      .createQueryBuilder('f')
      .where('f.status = :status', { status: FriendshipStatus.ACCEPTED })
      .andWhere('(f.userLowId = :actorId OR f.userHighId = :actorId)', {
        actorId,
      })
      .orderBy('f.updatedAt', 'DESC')
      .getMany();

    const friendIds = [
      ...new Set(
        friendRows.map((row) =>
          row.userLowId === actorId ? row.userHighId : row.userLowId,
        ),
      ),
    ];

    if (friendIds.length === 0) {
      return [];
    }

    let qb = this.usersRepo
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids: friendIds });

    const trimmed = search?.trim();
    if (trimmed) {
      const term = `%${trimmed}%`;
      qb = qb.andWhere(
        "(u.username ILIKE :term OR u.firstName ILIKE :term OR u.lastName ILIKE :term OR CONCAT(u.firstName, ' ', u.lastName) ILIKE :term)",
        { term },
      );
    }

    const users = await qb.orderBy('u.username', 'ASC').getMany();
    const byId = new Map(users.map((user) => [user.id, user]));

    return friendIds
      .map((friendId) => {
        const user = byId.get(friendId);
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
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }
}
