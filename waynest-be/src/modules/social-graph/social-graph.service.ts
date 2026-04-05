import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { FollowRelation } from './entities/follow-relation.entity';
import { BlockRelation } from './entities/block-relation.entity';
import { MuteRelation } from './entities/mute-relation.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { MediaService } from '../upload/media.service';

@Injectable()
export class SocialGraphService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(FollowRelation)
    private readonly followsRepo: Repository<FollowRelation>,
    @InjectRepository(BlockRelation)
    private readonly blocksRepo: Repository<BlockRelation>,
    @InjectRepository(MuteRelation)
    private readonly mutesRepo: Repository<MuteRelation>,
    private readonly notificationsService: NotificationsService,
    private readonly mediaService: MediaService,
  ) {}

  private async ensureUserExists(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async followUser(actorId: string, targetUserId: string) {
    if (actorId === targetUserId) {
      throw new BadRequestException('You cannot follow yourself');
    }
    await this.ensureUserExists(targetUserId);

    const blocking = await this.blocksRepo.findOne({
      where: [
        { blockerId: actorId, blockedId: targetUserId },
        { blockerId: targetUserId, blockedId: actorId },
      ],
    });
    if (blocking) {
      throw new BadRequestException('Follow unavailable due to block settings');
    }

    const existing = await this.followsRepo.findOne({
      where: { followerId: actorId, followingId: targetUserId },
    });
    if (existing) {
      return { following: true };
    }
    await this.followsRepo.save(
      this.followsRepo.create({ followerId: actorId, followingId: targetUserId }),
    );
    await this.notificationsService.createNotification({
      actorId,
      message: 'started following you',
      recipientId: targetUserId,
      type: NotificationType.FOLLOW,
    });
    return { following: true };
  }

  async unfollowUser(actorId: string, targetUserId: string) {
    await this.followsRepo.delete({ followerId: actorId, followingId: targetUserId });
    return { following: false };
  }

  async blockUser(actorId: string, targetUserId: string) {
    if (actorId === targetUserId) {
      throw new BadRequestException('You cannot block yourself');
    }
    await this.ensureUserExists(targetUserId);
    const existing = await this.blocksRepo.findOne({
      where: { blockerId: actorId, blockedId: targetUserId },
    });
    if (!existing) {
      await this.blocksRepo.save(
        this.blocksRepo.create({ blockerId: actorId, blockedId: targetUserId }),
      );
    }
    await this.followsRepo.delete({ followerId: actorId, followingId: targetUserId });
    await this.followsRepo.delete({ followerId: targetUserId, followingId: actorId });
    return { blocked: true };
  }

  async unblockUser(actorId: string, targetUserId: string) {
    await this.blocksRepo.delete({ blockerId: actorId, blockedId: targetUserId });
    return { blocked: false };
  }

  async muteUser(actorId: string, targetUserId: string) {
    if (actorId === targetUserId) {
      throw new BadRequestException('You cannot mute yourself');
    }
    await this.ensureUserExists(targetUserId);
    const existing = await this.mutesRepo.findOne({
      where: { muterId: actorId, mutedId: targetUserId },
    });
    if (!existing) {
      await this.mutesRepo.save(
        this.mutesRepo.create({ muterId: actorId, mutedId: targetUserId }),
      );
    }
    return { muted: true };
  }

  async unmuteUser(actorId: string, targetUserId: string) {
    await this.mutesRepo.delete({ muterId: actorId, mutedId: targetUserId });
    return { muted: false };
  }

  async getGraphState(actorId: string, targetUserId: string) {
    const [follow, block, mute, followersCount, followingCount] = await Promise.all([
      this.followsRepo.findOne({
        where: { followerId: actorId, followingId: targetUserId },
      }),
      this.blocksRepo.findOne({
        where: { blockerId: actorId, blockedId: targetUserId },
      }),
      this.mutesRepo.findOne({
        where: { muterId: actorId, mutedId: targetUserId },
      }),
      this.followsRepo.count({ where: { followingId: targetUserId } }),
      this.followsRepo.count({ where: { followerId: targetUserId } }),
    ]);

    return {
      blocked: Boolean(block),
      followersCount,
      following: Boolean(follow),
      followingCount,
      muted: Boolean(mute),
      targetUserId,
    };
  }

  async listFollowingIds(userId: string) {
    const follows = await this.followsRepo.find({ where: { followerId: userId } });
    return follows.map((item) => item.followingId);
  }

  async countFollowers(userId: string): Promise<number> {
    return this.followsRepo.count({ where: { followingId: userId } });
  }

  async countFollowing(userId: string): Promise<number> {
    return this.followsRepo.count({ where: { followerId: userId } });
  }

  private mapUserSummary(u: User) {
    return {
      userId: u.id,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      avatarUrl: this.mediaService.publicUploadRef(u.avatarUrl),
      role: u.role,
    };
  }

  async listFollowersForSelf(userId: string, search?: string) {
    const qb = this.followsRepo
      .createQueryBuilder('f')
      .innerJoinAndSelect('f.follower', 'u')
      .where('f.followingId = :id', { id: userId })
      .orderBy('f.createdAt', 'DESC');
    const trimmed = search?.trim();
    if (trimmed) {
      const term = `%${trimmed}%`;
      qb.andWhere(
        '(u.username ILIKE :term OR u.firstName ILIKE :term OR u.lastName ILIKE :term OR CONCAT(u.firstName, \' \', u.lastName) ILIKE :term)',
        { term },
      );
    }
    const rows = await qb.getMany();
    return rows.map((row) => this.mapUserSummary(row.follower));
  }

  async listFollowingForSelf(userId: string, search?: string) {
    const qb = this.followsRepo
      .createQueryBuilder('f')
      .innerJoinAndSelect('f.following', 'u')
      .where('f.followerId = :id', { id: userId })
      .orderBy('f.createdAt', 'DESC');
    const trimmed = search?.trim();
    if (trimmed) {
      const term = `%${trimmed}%`;
      qb.andWhere(
        '(u.username ILIKE :term OR u.firstName ILIKE :term OR u.lastName ILIKE :term OR CONCAT(u.firstName, \' \', u.lastName) ILIKE :term)',
        { term },
      );
    }
    const rows = await qb.getMany();
    return rows.map((row) => this.mapUserSummary(row.following));
  }
}

