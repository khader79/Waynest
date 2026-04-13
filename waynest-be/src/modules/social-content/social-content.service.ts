import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateProviderPostDto } from './dto/create-provider-post.dto';
import {
  SocialPost,
  SocialPostVisibility,
} from './entities/social-post.entity';
import { TripPlan } from 'src/trip-planner/entities/trip-planner.entity';
import { Place } from '../place/entities/place.entity';
import { Event } from '../event/entities/event.entity';
import { Provider } from '../providers/entities/provider.entity';
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
import { User } from '../users/entities/user.entity';
import { UpdatePostDto } from './dto/update-post.dto';
import { MediaService } from '../upload/media.service';
import { Story } from '../stories/entities/story.entity';
import {
  Friendship,
  FriendshipStatus,
} from '../social-graph/entities/friendship.entity';
import {
  applyDescendingCursor,
  decodeCursor,
  encodeCursor,
} from 'src/common/utils/cursor-pagination';

type FeedFilter = 'for-you' | 'following' | 'providers';

/**
 * Serialized post + engagement (plain object from `instanceToPlain`, not a class instance).
 * Typed as SocialPost intersection so internal callers keep correct field types.
 */
type EnrichedSocialPostResponse = SocialPost & {
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
};

@Injectable()
export class SocialContentService implements OnModuleInit {
  private ensureSchemaPromise: Promise<void> | null = null;
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(SocialPost)
    private readonly postsRepo: Repository<SocialPost>,
    @InjectRepository(Story)
    private readonly storiesRepo: Repository<Story>,
    @InjectRepository(TripPlan)
    private readonly tripPlansRepo: Repository<TripPlan>,
    @InjectRepository(Place)
    private readonly placesRepo: Repository<Place>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Provider)
    private readonly providersRepo: Repository<Provider>,
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
    @InjectRepository(Friendship)
    private readonly friendshipRepo: Repository<Friendship>,
    private readonly notificationsService: NotificationsService,
    private readonly mediaService: MediaService,
  ) {}

  private queueNotification(
    input: Parameters<NotificationsService['createNotification']>[0],
  ) {
    void this.notificationsService
      .createNotification(input)
      .catch(() => undefined);
  }

  async onModuleInit() {
    await this.ensureSocialPostsSchema();
  }

  private async ensureSocialPostsSchema() {
    if (!this.ensureSchemaPromise) {
      this.ensureSchemaPromise = this.postsRepo
        .query(
          [
            `ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS event_id uuid NULL`,
            `ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS provider_id uuid NULL`,
            `ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS trip_plan_id uuid NULL`,
            `ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}'`,
          ].join('; '),
        )
        .then(() => undefined)
        .catch(() => undefined);
    }
    await this.ensureSchemaPromise;
  }

  private normalizePostImageUrls(urls: string[] | undefined): string[] {
    if (!urls?.length) {
      return [];
    }
    const out: string[] = [];
    for (const u of urls) {
      out.push(this.mediaService.normalizeUploadImageRef(u));
    }
    return out;
  }

  /** API responses: always relative `/uploads/...` so clients resolve with their API base. */
  private denormalizePostImageUrlsForResponse(
    urls: string[] | null | undefined,
  ): string[] {
    if (!urls?.length) {
      return [];
    }
    return urls.map((u) => this.mediaService.toRelativeUploadPath(u) ?? u);
  }

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

    switch (post.visibility) {
      case SocialPostVisibility.PUBLIC:
        return true;
      case SocialPostVisibility.PRIVATE:
        return false;
      case SocialPostVisibility.FOLLOWERS: {
        if (post.providerId) {
          const follow = await this.followsRepo.findOne({
            where: { followerId: actorId, followingId: post.authorId },
          });
          return Boolean(follow);
        }
        const { low, high } =
          actorId < post.authorId
            ? { low: actorId, high: post.authorId }
            : { low: post.authorId, high: actorId };
        const fr = await this.friendshipRepo.findOne({
          where: {
            userLowId: low,
            userHighId: high,
            status: FriendshipStatus.ACCEPTED,
          },
        });
        return Boolean(fr);
      }
      case SocialPostVisibility.FRIENDS: {
        const { low, high } =
          actorId < post.authorId
            ? { low: actorId, high: post.authorId }
            : { low: post.authorId, high: actorId };
        const fr = await this.friendshipRepo.findOne({
          where: {
            userLowId: low,
            userHighId: high,
            status: FriendshipStatus.ACCEPTED,
          },
        });
        return Boolean(fr);
      }
      default:
        return false;
    }
  }

  /** Batched visibility check for feed lists (avoids N+1 block/follow queries). */
  private async filterVisiblePosts(
    posts: SocialPost[],
    actorId: string | null,
  ): Promise<SocialPost[]> {
    if (!actorId) {
      return posts.filter((p) => p.visibility === SocialPostVisibility.PUBLIC);
    }

    const authorIds = [...new Set(posts.map((p) => p.authorId))];
    const [blockedOutgoing, blockedIncoming] =
      authorIds.length > 0
        ? await Promise.all([
            this.blocksRepo.find({
              where: { blockerId: actorId, blockedId: In(authorIds) },
              select: { blockedId: true },
            }),
            this.blocksRepo.find({
              where: { blockedId: actorId, blockerId: In(authorIds) },
              select: { blockerId: true },
            }),
          ])
        : [[], []];

    const blockedAuthors = new Set<string>();
    for (const b of blockedOutgoing) {
      blockedAuthors.add(b.blockedId);
    }
    for (const b of blockedIncoming) {
      blockedAuthors.add(b.blockerId);
    }

    const follows = await this.followsRepo.find({
      where: { followerId: actorId },
      select: { followingId: true },
    });
    const following = new Set(follows.map((f) => f.followingId));

    const [friendRowsLow, friendRowsHigh] = await Promise.all([
      this.friendshipRepo.find({
        where: { userLowId: actorId, status: FriendshipStatus.ACCEPTED },
        select: { userLowId: true, userHighId: true },
      }),
      this.friendshipRepo.find({
        where: { userHighId: actorId, status: FriendshipStatus.ACCEPTED },
        select: { userLowId: true, userHighId: true },
      }),
    ]);
    const friendRows = [...friendRowsLow, ...friendRowsHigh];
    const friends = new Set<string>();
    for (const r of friendRows) {
      friends.add(r.userLowId === actorId ? r.userHighId : r.userLowId);
    }

    return posts.filter((post) => {
      if (post.authorId === actorId) {
        return true;
      }
      if (blockedAuthors.has(post.authorId)) {
        return false;
      }
      switch (post.visibility) {
        case SocialPostVisibility.PUBLIC:
          return true;
        case SocialPostVisibility.PRIVATE:
          return false;
        case SocialPostVisibility.FOLLOWERS:
          return post.providerId
            ? following.has(post.authorId)
            : friends.has(post.authorId);
        case SocialPostVisibility.FRIENDS:
          return friends.has(post.authorId);
        default:
          return false;
      }
    });
  }

  /** Host-agnostic `/uploads/...` for nested user avatars in JSON responses. */
  private normalizeAuthorAvatarInPlain(author: unknown): unknown {
    if (!author || typeof author !== 'object') {
      return author;
    }
    const a = author as Record<string, unknown>;
    return {
      ...a,
      avatarUrl: this.mediaService.publicUploadRef(
        a.avatarUrl as string | null | undefined,
      ),
    };
  }

  private async loadPostAccess(postId: string) {
    return this.postsRepo.findOne({
      where: { id: postId },
      select: ['id', 'authorId', 'visibility', 'tripPlanId'],
    });
  }

  private async loadAuthorsByIds(authorIds: string[]) {
    if (authorIds.length === 0) {
      return new Map<string, User>();
    }

    const authors = await this.usersRepo.find({
      where: { id: In(authorIds) },
      select: ['id', 'username', 'firstName', 'lastName', 'avatarUrl'],
    });

    return new Map(authors.map((author) => [author.id, author]));
  }

  /** Adds like/comment counts and whether the current user liked each post (for API responses). */
  private async enrichPostsWithEngagement(
    posts: SocialPost[],
    actorId: string | null,
  ): Promise<EnrichedSocialPostResponse[]> {
    if (posts.length === 0) {
      return [];
    }
    const ids = posts.map((p) => p.id);
    const [likeRows, commentRows] = await Promise.all([
      this.reactionsRepo
        .createQueryBuilder('r')
        .select('r.postId', 'postId')
        .addSelect('COUNT(*)', 'cnt')
        .where('r.postId IN (:...ids)', { ids })
        .groupBy('r.postId')
        .getRawMany<{ postId: string; cnt: string }>(),
      this.commentsRepo
        .createQueryBuilder('c')
        .select('c.postId', 'postId')
        .addSelect('COUNT(*)', 'cnt')
        .where('c.postId IN (:...ids)', { ids })
        .groupBy('c.postId')
        .getRawMany<{ postId: string; cnt: string }>(),
    ]);

    const likeMap = new Map(likeRows.map((r) => [r.postId, Number(r.cnt)]));
    const commentMap = new Map(
      commentRows.map((r) => [r.postId, Number(r.cnt)]),
    );

    let likedPostIds = new Set<string>();
    let savedPostIds = new Set<string>();
    if (actorId) {
      const [mine, mySaves] = await Promise.all([
        this.reactionsRepo.find({
          where: { userId: actorId, postId: In(ids) },
          select: ['postId'],
        }),
        this.savesRepo.find({
          where: { userId: actorId, postId: In(ids) },
          select: ['postId'],
        }),
      ]);
      likedPostIds = new Set(mine.map((m) => m.postId));
      savedPostIds = new Set(mySaves.map((s) => s.postId));
    }

    return posts.map((post): EnrichedSocialPostResponse => {
      const plain = instanceToPlain(post) as Record<string, unknown>;
      const merged = {
        ...plain,
        author: this.normalizeAuthorAvatarInPlain(plain.author),
        imageUrls: this.denormalizePostImageUrlsForResponse(post.imageUrls),
        likeCount: likeMap.get(post.id) ?? 0,
        commentCount: commentMap.get(post.id) ?? 0,
        likedByMe: actorId ? likedPostIds.has(post.id) : false,
        savedByMe: actorId ? savedPostIds.has(post.id) : false,
      };
      return merged as EnrichedSocialPostResponse;
    });
  }

  async createPost(
    actorId: string,
    dto: CreatePostDto,
    opts?: { provider?: Provider; event?: Event },
  ) {
    await this.ensureSocialPostsSchema();
    assertNoAbusiveContent(dto.title ?? '', 'post title');
    assertNoAbusiveContent(dto.body ?? '', 'post body');
    if (dto.locationLabel?.trim()) {
      assertNoAbusiveContent(dto.locationLabel.trim(), 'location');
    }

    const provider = opts?.provider ?? null;
    const linkedEvent = opts?.event ?? null;
    const placeId = dto.placeId?.trim();
    let linkedPlace: Place | null = null;
    if (placeId) {
      linkedPlace = await this.placesRepo.findOne({
        where: { id: placeId, isActive: true },
        relations: ['city'],
      });
      if (!linkedPlace) {
        throw new NotFoundException({
          message: 'Place not found',
          messageKey: 'errors.api.placeNotFound',
        });
      }
    }

    if (!linkedPlace && linkedEvent?.venue) {
      linkedPlace = linkedEvent.venue;
    }

    const tripPlanId = dto.tripPlanId?.trim();
    let linkedTrip: TripPlan | null = null;

    if (tripPlanId) {
      linkedTrip = await this.tripPlansRepo.findOne({
        where: { id: tripPlanId },
      });
      if (!linkedTrip) {
        throw new NotFoundException({
          message: 'Trip plan not found',
          messageKey: 'errors.api.tripPlanNotFound',
        });
      }
      if (linkedTrip.userId !== actorId) {
        throw new ForbiddenException({
          message: 'Cannot publish another user trip',
          messageKey: 'errors.api.tripPlanForbidden',
        });
      }
    }

    const hasImages = Array.isArray(dto.imageUrls) && dto.imageUrls.length > 0;
    const hasText = Boolean(dto.title?.trim() || dto.body?.trim());
    const hasLocation = Boolean(dto.locationLabel?.trim() || linkedPlace);

    if (!linkedTrip && !hasText && !hasImages && !hasLocation) {
      throw new BadRequestException({
        message: 'Add text, photos, a place, or attach a saved plan',
        messageKey: 'errors.api.postNeedsContent',
      });
    }

    const lat =
      typeof dto.locationLat === 'number' && Number.isFinite(dto.locationLat)
        ? dto.locationLat
        : null;
    const lng =
      typeof dto.locationLng === 'number' && Number.isFinite(dto.locationLng)
        ? dto.locationLng
        : null;

    const snapshot: Record<string, unknown> = {};
    if (linkedTrip?.generatedPlan) {
      snapshot.generatedPlan = linkedTrip.generatedPlan;
    }
    if (linkedPlace) {
      const label = `${linkedPlace.name}${linkedPlace.city?.name ? `, ${linkedPlace.city.name}` : ''}`;
      snapshot.location = {
        placeId: linkedPlace.id,
        slug: linkedPlace.slug,
        label,
        lat: Number(linkedPlace.latitude),
        lng: Number(linkedPlace.longitude),
      };
    } else if (dto.locationLabel?.trim()) {
      snapshot.location = {
        label: dto.locationLabel.trim(),
        lat,
        lng,
      };
    }

    if (linkedEvent) {
      snapshot.event = {
        id: linkedEvent.id,
        title: linkedEvent.title,
        slug: linkedEvent.slug,
        startDate:
          linkedEvent.startDate?.toISOString?.() ?? linkedEvent.startDate,
        endDate: linkedEvent.endDate?.toISOString?.() ?? linkedEvent.endDate,
        venue: linkedEvent.venue
          ? {
              id: linkedEvent.venue.id,
              name: linkedEvent.venue.name,
              slug: linkedEvent.venue.slug,
            }
          : null,
      };
    }

    const vis = dto.visibility ?? SocialPostVisibility.PUBLIC;
    // Enforce visibility rules:
    // - FOLLOWERS visibility only allowed for provider posts
    // - FRIENDS visibility only makes sense for regular user posts
    if (vis === SocialPostVisibility.FOLLOWERS && !provider) {
      throw new BadRequestException(
        'FOLLOWERS visibility allowed only for provider posts',
      );
    }
    if (vis === SocialPostVisibility.FRIENDS && provider) {
      throw new BadRequestException(
        'FRIENDS visibility not allowed for provider posts',
      );
    }

    const post = this.postsRepo.create({
      authorId: actorId,
      body: linkedTrip
        ? (dto.body ?? linkedTrip.description ?? null)
        : dto.body?.trim() || null,
      imageUrls: this.normalizePostImageUrls(dto.imageUrls),
      shareSlug: linkedTrip?.shareSlug ?? null,
      snapshot,
      title: linkedTrip
        ? (dto.title ?? linkedTrip.title ?? null)
        : dto.title?.trim() || null,
      tripPlanId: linkedTrip?.id ?? null,
      eventId: linkedEvent?.id ?? null,
      providerId: provider?.id ?? null,
      visibility: vis,
    });
    return this.postsRepo.save(post);
  }

  async createProviderPost(actorId: string, dto: CreateProviderPostDto) {
    const provider = await this.resolveActorProvider(actorId);
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const eventId = dto.eventId?.trim();
    let linkedEvent: Event | null = null;
    if (eventId) {
      linkedEvent = await this.eventRepo.findOne({
        where: { id: eventId },
        relations: ['venue', 'venue.provider'],
      });
      if (!linkedEvent) {
        throw new NotFoundException('Event not found');
      }
      const venueProviderId = linkedEvent.venue?.provider?.id;
      if (!venueProviderId || venueProviderId !== provider.id) {
        throw new BadRequestException('Cannot post about this event');
      }
    }

    return this.createPost(actorId, dto, {
      provider,
      event: linkedEvent ?? undefined,
    });
  }

  private async resolveActorProvider(
    actorId: string,
  ): Promise<Provider | null> {
    return this.providersRepo
      .createQueryBuilder('provider')
      .innerJoin('provider.memberships', 'membership')
      .innerJoin('membership.user', 'user')
      .where('user.id = :actorId', { actorId })
      .getOne();
  }

  async updatePost(postId: string, actorId: string, dto: UpdatePostDto) {
    await this.ensureSocialPostsSchema();
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.authorId !== actorId) {
      throw new ForbiddenException('Not allowed to update this post');
    }
    const previousImages = [...(post.imageUrls ?? [])];
    if (typeof dto.title === 'string') {
      assertNoAbusiveContent(dto.title, 'post title');
      post.title = dto.title.trim() || null;
    }
    if (typeof dto.body === 'string') {
      assertNoAbusiveContent(dto.body, 'post body');
      post.body = dto.body.trim() || null;
    }
    if (dto.visibility) {
      post.visibility = dto.visibility;
    }
    if (Array.isArray(dto.imageUrls)) {
      post.imageUrls = this.normalizePostImageUrls(dto.imageUrls);
    }
    const saved = await this.postsRepo.save(post);
    const nextImages = new Set(saved.imageUrls ?? []);
    for (const image of previousImages) {
      if (!nextImages.has(image)) {
        await this.deleteImageIfOrphaned(image, { excludePostId: post.id });
      }
    }
    return saved;
  }

  async deletePost(postId: string, actorId: string) {
    await this.ensureSocialPostsSchema();
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.authorId !== actorId) {
      throw new ForbiddenException('Not allowed to delete this post');
    }
    await this.commentsRepo.delete({ postId });
    await this.reactionsRepo.delete({ postId });
    await this.savesRepo.delete({ postId });
    await this.reportsRepo.delete({ postId });
    await this.postsRepo.delete({ id: postId });
    for (const image of post.imageUrls ?? []) {
      await this.deleteImageIfOrphaned(image, { excludePostId: post.id });
    }
    return { deleted: true };
  }

  private async deleteImageIfOrphaned(
    imageUrl: string,
    opts: { excludePostId?: string } = {},
  ) {
    if (!imageUrl) return;
    const variants = this.mediaService.uploadRefVariantsForQuery(imageUrl);
    if (variants.length === 0) return;

    const usedByOtherPost = await this.postsRepo
      .createQueryBuilder('post')
      .where(
        new Brackets((qb) => {
          variants.forEach((v, i) => {
            qb.orWhere(`:pv${i} = ANY(post.imageUrls)`, { [`pv${i}`]: v });
          });
        }),
      )
      .andWhere(opts.excludePostId ? 'post.id != :excludePostId' : '1=1', {
        excludePostId: opts.excludePostId,
      })
      .getExists();
    if (usedByOtherPost) return;

    const usedByStory = await this.storiesRepo
      .createQueryBuilder('story')
      .where(
        new Brackets((qb) => {
          variants.forEach((v, i) => {
            qb.orWhere(`story.imageUrl = :sv${i}`, { [`sv${i}`]: v });
          });
        }),
      )
      .getExists();
    if (usedByStory) return;

    this.mediaService.deleteByUrl(imageUrl);
  }

  async listPostsByAuthorUsername(
    username: string,
    actorId: string | null,
    limit = 30,
  ) {
    await this.ensureSocialPostsSchema();
    const safeLimit = Math.max(1, Math.min(limit, 50));
    const author = await this.usersRepo.findOne({
      where: { username: username.trim() },
    });
    if (!author) {
      throw new NotFoundException('User not found');
    }
    const posts = await this.postsRepo.find({
      where: { authorId: author.id },
      relations: ['author', 'provider'],
      order: { createdAt: 'DESC' },
      take: safeLimit,
    });
    const visible = await this.filterVisiblePosts(posts, actorId);
    return this.enrichPostsWithEngagement(visible, actorId);
  }

  async listPostsByProviderSlug(
    slug: string,
    actorId: string | null,
    limit = 30,
  ) {
    await this.ensureSocialPostsSchema();
    const safeLimit = Math.max(1, Math.min(limit, 50));
    const posts = await this.postsRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.provider', 'provider')
      .where('provider.slug = :slug', { slug: slug.trim() })
      .orderBy('post.createdAt', 'DESC')
      .take(safeLimit)
      .getMany();
    const visible = await this.filterVisiblePosts(posts, actorId);
    return this.enrichPostsWithEngagement(visible, actorId);
  }

  async listFeed(
    actorId: string | null,
    filter: FeedFilter = 'for-you',
    limit = 20,
    cursor?: string,
  ) {
    await this.ensureSocialPostsSchema();
    const safeLimit = Math.max(1, Math.min(limit, 50));

    const cursorToken = decodeCursor(cursor);
    const candidateLimit = Math.min(
      Math.max(safeLimit * 4, safeLimit + 10),
      100,
    );

    const query = this.postsRepo
      .createQueryBuilder('post')
      .select([
        'post.id',
        'post.authorId',
        'post.providerId',
        'post.visibility',
        'post.createdAt',
        'post.title',
        'post.body',
        'post.imageUrls',
        'post.shareSlug',
        'post.snapshot',
        'post.tripPlanId',
      ])
      .orderBy('post.createdAt', 'DESC')
      .addOrderBy('post.id', 'DESC');

    if (cursorToken) {
      applyDescendingCursor(query, 'post', cursorToken);
    }

    if (!actorId) {
      query.andWhere('post.visibility = :visibility', {
        visibility: SocialPostVisibility.PUBLIC,
      });
    }

    const [followRows, mutedRows] = actorId
      ? await Promise.all([
          this.followsRepo.find({
            where: { followerId: actorId },
            select: { followingId: true },
          }),
          this.mutesRepo.find({
            where: { muterId: actorId },
            select: { mutedId: true },
          }),
        ])
      : [[], []];

    if (filter === 'providers') {
      query.andWhere('post.providerId IS NOT NULL');
    }

    if (filter === 'following') {
      if (!actorId) {
        return { data: [], nextCursor: null, hasMore: false };
      }

      const followingIds = new Set(followRows.map((item) => item.followingId));
      if (followingIds.size === 0) {
        return { data: [], nextCursor: null, hasMore: false };
      }

      query.andWhere('post.authorId IN (:...followingIds)', {
        followingIds: [...followingIds],
      });
    }

    const candidatePosts = (await query
      .take(candidateLimit + 1)
      .getMany()) as SocialPost[];
    if (candidatePosts.length === 0) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    const mutedIds = new Set(mutedRows.map((item) => item.mutedId));
    const filteredCandidates =
      mutedIds.size > 0
        ? candidatePosts.filter((post) => !mutedIds.has(post.authorId))
        : candidatePosts;

    const visible = await this.filterVisiblePosts(filteredCandidates, actorId);
    if (visible.length === 0) {
      return {
        data: [],
        nextCursor:
          candidatePosts.length > safeLimit
            ? encodeCursor(candidatePosts[candidatePosts.length - 1])
            : null,
        hasMore: candidatePosts.length > safeLimit,
      };
    }

    const pagePosts = visible.slice(0, safeLimit);
    const authorMap = await this.loadAuthorsByIds([
      ...new Set(pagePosts.map((post) => post.authorId)),
    ]);

    for (const post of pagePosts) {
      post.author = authorMap.get(post.authorId) ?? post.author ?? null;
    }

    const enriched = await this.enrichPostsWithEngagement(pagePosts, actorId);

    return {
      data: enriched,
      nextCursor:
        visible.length > safeLimit && pagePosts.length > 0
          ? encodeCursor(pagePosts[pagePosts.length - 1])
          : candidatePosts.length > safeLimit
            ? encodeCursor(candidatePosts[candidatePosts.length - 1])
            : null,
      hasMore: visible.length > safeLimit || candidatePosts.length > safeLimit,
    };
  }

  async getPostById(postId: string, actorId?: string | null) {
    await this.ensureSocialPostsSchema();
    const post = await this.postsRepo.findOne({
      where: { id: postId },
      relations: ['author', 'provider'],
    });
    if (!post) {
      throw new NotFoundException({
        message: 'Post not found',
        messageKey: 'errors.api.postNotFound',
      });
    }
    if (!(await this.canViewPost(post, actorId))) {
      throw new ForbiddenException({
        message: 'Access denied',
        messageKey: 'errors.api.postAccessDenied',
      });
    }
    const [enriched] = await this.enrichPostsWithEngagement(
      [post],
      actorId ?? null,
    );
    return enriched;
  }

  async toggleLike(postId: string, actorId: string) {
    const post = await this.loadPostAccess(postId);
    if (!post) {
      throw new NotFoundException({
        message: 'Post not found',
        messageKey: 'errors.api.postNotFound',
      });
    }
    const [canView, existing] = await Promise.all([
      this.canViewPost(post, actorId),
      this.reactionsRepo.findOne({
        where: { postId, userId: actorId },
        select: { id: true },
      }),
    ]);
    if (!canView) {
      throw new ForbiddenException({
        message: 'Access denied',
        messageKey: 'errors.api.postAccessDenied',
      });
    }
    if (existing) {
      await this.reactionsRepo.delete({ id: existing.id });
    } else {
      await this.reactionsRepo.insert({ postId, userId: actorId });
      if (post.authorId !== actorId) {
        this.queueNotification({
          actorId,
          message: 'liked your post',
          meta: { postId },
          recipientId: post.authorId,
          type: NotificationType.LIKE,
        });
      }
    }
    const likeCount = await this.reactionsRepo.count({ where: { postId } });
    const liked = !existing;
    return { liked, likeCount };
  }

  async savePost(postId: string, actorId: string) {
    const post = await this.loadPostAccess(postId);
    if (!post) {
      throw new NotFoundException({
        message: 'Post not found',
        messageKey: 'errors.api.postNotFound',
      });
    }
    if (!(await this.canViewPost(post, actorId))) {
      throw new ForbiddenException({
        message: 'Access denied',
        messageKey: 'errors.api.postAccessDenied',
      });
    }
    const existing = await this.savesRepo.findOne({
      where: { postId, userId: actorId },
    });
    if (!existing) {
      await this.savesRepo.insert({ postId, userId: actorId });
    }

    let copiedTripPlanId: string | null = null;
    if (post.tripPlanId) {
      const source = await this.tripPlansRepo.findOne({
        where: { id: post.tripPlanId },
      });
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
          this.queueNotification({
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

  async createComment(
    postId: string,
    actorId: string,
    dto: CreatePostCommentDto,
  ) {
    const post = await this.loadPostAccess(postId);
    if (!post) {
      throw new NotFoundException({
        message: 'Post not found',
        messageKey: 'errors.api.postNotFound',
      });
    }
    if (!(await this.canViewPost(post, actorId))) {
      throw new ForbiddenException({
        message: 'Access denied',
        messageKey: 'errors.api.postAccessDenied',
      });
    }
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
      this.queueNotification({
        actorId,
        message: dto.parentId
          ? 'replied to your post comment'
          : 'commented on your post',
        meta: { commentId: saved.id, postId },
        recipientId: post.authorId,
        type: dto.parentId ? NotificationType.REPLY : NotificationType.COMMENT,
      });
    }
    return saved;
  }

  async listComments(postId: string, actorId?: string | null) {
    await this.getPostById(postId, actorId);
    const rows = await this.commentsRepo.find({
      where: { postId },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });
    return rows.map((c) => {
      const plain = instanceToPlain(c) as Record<string, unknown>;
      const merged = {
        ...plain,
        author: this.normalizeAuthorAvatarInPlain(plain.author),
      };
      return merged;
    });
  }

  async reportPost(postId: string, actorId: string, dto: ReportPostDto) {
    const post = await this.loadPostAccess(postId);
    if (!post) {
      throw new NotFoundException({
        message: 'Post not found',
        messageKey: 'errors.api.postNotFound',
      });
    }
    if (!(await this.canViewPost(post, actorId))) {
      throw new ForbiddenException({
        message: 'Access denied',
        messageKey: 'errors.api.postAccessDenied',
      });
    }
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
    await this.reportsRepo.insert({
      moderatedAt: null,
      moderatedBy: null,
      moderationNote: null,
      postId,
      reason: dto.reason.trim(),
      reporterId: actorId,
      status: PostReportStatus.OPEN,
    });
    return { reported: true };
  }

  async listReports(status?: PostReportStatus) {
    return this.reportsRepo.find({
      where: status ? { status } : {},
      relations: ['post', 'reporter'],
      order: { createdAt: 'DESC' },
    });
  }

  async moderateReport(
    id: string,
    moderatorId: string,
    dto: ModeratePostReportDto,
  ) {
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
