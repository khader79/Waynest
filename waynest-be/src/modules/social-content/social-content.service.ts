import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { SocialPost, SocialPostVisibility } from './entities/social-post.entity';
import { TripPlan } from 'src/trip-planner/entities/trip-planner.entity';
import { FollowRelation } from '../social-graph/entities/follow-relation.entity';
import { BlockRelation } from '../social-graph/entities/block-relation.entity';
import { MuteRelation } from '../social-graph/entities/mute-relation.entity';
import { PostReaction } from './entities/post-reaction.entity';
import { PostSave } from './entities/post-save.entity';
import { PostComment } from './entities/post-comment.entity';
import { CreatePostCommentDto } from './dto/create-post-comment.dto';
import { ReportPostDto } from './dto/report-post.dto';
import { PostReport, PostReportStatus } from './entities/post-report.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { ModeratePostReportDto } from './dto/moderate-post-report.dto';
import { assertNoAbusiveContent } from 'src/common/utils/contentModeration';

type FeedFilter = 'for-you' | 'following' | 'providers';

@Injectable()
export class SocialContentService {
  constructor(
    @InjectRepository(SocialPost)
    private readonly postsRepo: Repository<SocialPost>,
    @InjectRepository(TripPlan)
    private readonly tripPlansRepo: Repository<TripPlan>,
    @InjectRepository(FollowRelation)
    private readonly followsRepo: Repository<FollowRelation>,
    @InjectRepository(BlockRelation)
    private readonly blocksRepo: Repository<BlockRelation>,
    @InjectRepository(MuteRelation)
    private readonly mutesRepo: Repository<MuteRelation>,
    @InjectRepository(PostReaction)
    private readonly reactionsRepo: Repository<PostReaction>,
    @InjectRepository(PostSave)
    private readonly savesRepo: Repository<PostSave>,
    @InjectRepository(PostComment)
    private readonly commentsRepo: Repository<PostComment>,
    @InjectRepository(PostReport)
    private readonly reportsRepo: Repository<PostReport>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async canViewPost(post: SocialPost, actorId?: string | null) {
    if (!actorId) {
      return post.visibility === SocialPostVisibility.PUBLIC;
    }
    if (post.authorId === actorId) {
      return true;
    }

    const blocked = await this.blocksRepo.findOne({
      where: [
        { blockerId: actorId, blockedId: post.authorId },
        { blockerId: post.authorId, blockedId: actorId },
      ],
    });
    if (blocked) {
      return false;
    }

    if (post.visibility === SocialPostVisibility.PUBLIC) {
      return true;
    }
    if (post.visibility === SocialPostVisibility.PRIVATE) {
      return false;
    }
    const follow = await this.followsRepo.findOne({
      where: { followerId: actorId, followingId: post.authorId },
    });
    return Boolean(follow);
  }

  async createPost(actorId: string, dto: CreatePostDto) {
    assertNoAbusiveContent(dto.title ?? '', 'post title');
    assertNoAbusiveContent(dto.body ?? '', 'post body');
    const linkedTrip = await this.tripPlansRepo.findOne({ where: { id: dto.tripPlanId } });
    if (!linkedTrip) {
      throw new NotFoundException('Trip plan not found');
    }
    if (linkedTrip.userId !== actorId) {
      throw new ForbiddenException('Cannot publish another user trip');
    }

    const post = this.postsRepo.create({
      authorId: actorId,
      body: dto.body ?? linkedTrip?.description ?? null,
      shareSlug: linkedTrip?.shareSlug ?? null,
      snapshot: linkedTrip?.generatedPlan ? { generatedPlan: linkedTrip.generatedPlan } : {},
      title: dto.title ?? linkedTrip?.title ?? null,
      tripPlanId: dto.tripPlanId ?? null,
      visibility: dto.visibility ?? SocialPostVisibility.PUBLIC,
    });
    return this.postsRepo.save(post);
  }

  async listFeed(actorId: string | null, filter: FeedFilter = 'for-you', limit = 20) {
    const safeLimit = Math.max(1, Math.min(limit, 50));
    const qb = this.postsRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.provider', 'provider')
      .orderBy('post.createdAt', 'DESC')
      .take(safeLimit);

    if (filter === 'providers') {
      qb.andWhere('post.providerId IS NOT NULL');
    }

    if (filter === 'following' && actorId) {
      const followIds = await this.followsRepo.find({ where: { followerId: actorId } });
      const ids = followIds.map((item) => item.followingId);
      if (ids.length === 0) {
        return [];
      }
      qb.andWhere('post.authorId IN (:...ids)', { ids });
    }

    if (actorId) {
      const muted = await this.mutesRepo.find({ where: { muterId: actorId } });
      const mutedIds = muted.map((item) => item.mutedId);
      if (mutedIds.length > 0) {
        qb.andWhere('post.authorId NOT IN (:...mutedIds)', { mutedIds });
      }
    }

    const posts = await qb.getMany();
    const filtered: SocialPost[] = [];
    for (const post of posts) {
      if (await this.canViewPost(post, actorId)) {
        filtered.push(post);
      }
    }
    return filtered;
  }

  async getPostById(postId: string, actorId?: string | null) {
    const post = await this.postsRepo.findOne({
      where: { id: postId },
      relations: ['author', 'provider'],
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (!(await this.canViewPost(post, actorId))) {
      throw new ForbiddenException('Access denied');
    }
    return post;
  }

  async toggleLike(postId: string, actorId: string) {
    const post = await this.getPostById(postId, actorId);
    const existing = await this.reactionsRepo.findOne({ where: { postId, userId: actorId } });
    if (existing) {
      await this.reactionsRepo.delete({ id: existing.id });
      return { liked: false };
    }
    await this.reactionsRepo.save(this.reactionsRepo.create({ postId, userId: actorId }));
    if (post.authorId !== actorId) {
      await this.notificationsService.createNotification({
        actorId,
        message: 'liked your post',
        meta: { postId },
        recipientId: post.authorId,
        type: NotificationType.LIKE,
      });
    }
    return { liked: true };
  }

  async savePost(postId: string, actorId: string) {
    const post = await this.getPostById(postId, actorId);
    const existing = await this.savesRepo.findOne({ where: { postId, userId: actorId } });
    if (!existing) {
      await this.savesRepo.save(this.savesRepo.create({ postId, userId: actorId }));
    }

    let copiedTripPlanId: string | null = null;
    if (post.tripPlanId) {
      const source = await this.tripPlansRepo.findOne({ where: { id: post.tripPlanId } });
      if (source?.generatedPlan) {
        const copy = this.tripPlansRepo.create({
          budget: source.budget,
          cityId: source.cityId,
          days: source.days,
          description: source.description,
          generatedPlan: source.generatedPlan,
          isPublic: false,
          persons: source.persons,
          shareSlug: null,
          title: source.title,
          userId: actorId,
        });
        const savedCopy = await this.tripPlansRepo.save(copy);
        copiedTripPlanId = savedCopy.id;
        if (post.authorId !== actorId) {
          await this.notificationsService.createNotification({
            actorId,
            message: 'saved and copied your trip plan',
            meta: { copiedTripPlanId, postId },
            recipientId: post.authorId,
            type: NotificationType.PLAN_COPIED,
          });
        }
      }
    }
    return { copiedTripPlanId, saved: true };
  }

  async unsavePost(postId: string, actorId: string) {
    await this.savesRepo.delete({ postId, userId: actorId });
    return { saved: false };
  }

  async createComment(postId: string, actorId: string, dto: CreatePostCommentDto) {
    const post = await this.getPostById(postId, actorId);
    assertNoAbusiveContent(dto.content, 'comment');
    if (dto.parentId) {
      const parent = await this.commentsRepo.findOne({
        where: { id: dto.parentId, postId },
      });
      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }
    }
    const comment = this.commentsRepo.create({
      authorId: actorId,
      content: dto.content.trim(),
      parentId: dto.parentId ?? null,
      postId,
    });
    const saved = await this.commentsRepo.save(comment);
    if (post.authorId !== actorId) {
      await this.notificationsService.createNotification({
        actorId,
        message: dto.parentId ? 'replied to your post comment' : 'commented on your post',
        meta: { commentId: saved.id, postId },
        recipientId: post.authorId,
        type: dto.parentId ? NotificationType.REPLY : NotificationType.COMMENT,
      });
    }
    return saved;
  }

  async listComments(postId: string, actorId?: string | null) {
    await this.getPostById(postId, actorId);
    return this.commentsRepo.find({
      where: { postId },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });
  }

  async reportPost(postId: string, actorId: string, dto: ReportPostDto) {
    const post = await this.getPostById(postId, actorId);
    assertNoAbusiveContent(dto.reason, 'report reason');
    if (post.authorId === actorId) {
      throw new BadRequestException('Cannot report your own post');
    }
    const existing = await this.reportsRepo.findOne({
      where: { postId, reporterId: actorId },
    });
    if (existing) {
      return { reported: true };
    }
    await this.reportsRepo.save(
      this.reportsRepo.create({
        moderatedAt: null,
        moderatedBy: null,
        moderationNote: null,
        postId,
        reason: dto.reason.trim(),
        reporterId: actorId,
        status: PostReportStatus.OPEN,
      }),
    );
    return { reported: true };
  }

  async listReports(status?: PostReportStatus) {
    return this.reportsRepo.find({
      where: status ? { status } : {},
      relations: ['post', 'reporter'],
      order: { createdAt: 'DESC' },
    });
  }

  async moderateReport(id: string, moderatorId: string, dto: ModeratePostReportDto) {
    const report = await this.reportsRepo.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    report.status = dto.status;
    report.moderationNote = dto.moderationNote ?? null;
    report.moderatedBy = moderatorId;
    report.moderatedAt = new Date();
    return this.reportsRepo.save(report);
  }
}

