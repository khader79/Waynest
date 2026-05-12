import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Inject,
  Optional,
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
import { Wishlist } from '../wishlist/entities/wishlist.entity';
import {
  applyDescendingCursor,
  decodeCursor,
  encodeCursor,
} from 'src/common/utils/cursor-pagination';
import { HotPathCache } from '../../common/utils/hot-path-cache';
import { REDIS_CLIENT_TOKEN } from '../../common/redis/redis.module';

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

type WeightedSignal = {
  key: string;
  label: string;
  weight: number;
};

type WeightedSignalMap = Map<string, WeightedSignal>;

type RecommendationProfile = {
  tagSignals: WeightedSignalMap;
  typeSignals: WeightedSignalMap;
  citySignals: WeightedSignalMap;
  providerSignals: WeightedSignalMap;
  excludedPlaceIds: Set<string>;
  signalSources: Set<string>;
  totalSignalWeight: number;
};

type RecommendationReasonBundle = {
  reason: string;
  reasons: string[];
  matchedSignals: string[];
};

export type RecommendedPlaceItem = {
  id: string;
  slug: string;
  name: string;
  type: string;
  imageUrl: string | null;
  description: string;
  ratingAverage: number;
  ratingCount: number;
  isVerified: boolean;
  city: {
    id: string | null;
    name: string | null;
    countryName: string | null;
  };
  provider: {
    id: string | null;
    displayName: string | null;
    slug: string | null;
  };
  tags: Array<{ id: string; name: string }>;
  score: number;
  reason: string;
  reasons: string[];
  matchedSignals: string[];
};

export type RecommendedPlacesResponse = {
  source: 'personalized' | 'trending';
  profile: {
    confidence: 'low' | 'medium' | 'high';
    topTags: string[];
    topTypes: string[];
    topCities: string[];
    topProviders: string[];
  };
  items: RecommendedPlaceItem[];
};

@Injectable()
export class SocialContentService implements OnModuleInit {
  private ensureSchemaPromise: Promise<void> | null = null;
  private readonly recommendationsCache: HotPathCache;
  private readonly feedCache: HotPathCache;

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
    @InjectRepository(Wishlist)
    private readonly wishlistRepo: Repository<Wishlist>,
    @InjectRepository(Friendship)
    private readonly friendshipRepo: Repository<Friendship>,
    private readonly notificationsService: NotificationsService,
    private readonly mediaService: MediaService,

    @Optional()
    @Inject(REDIS_CLIENT_TOKEN)
    redisClient?: any,
  ) {
    this.recommendationsCache = new HotPathCache(150, redisClient || undefined);
    this.feedCache = new HotPathCache(150, redisClient || undefined);
  }

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

  private normalizeRecommendationSignalKey(value?: string | null) {
    return value?.trim().toLowerCase() ?? '';
  }

  private formatPlaceTypeLabel(type?: string | null) {
    const normalized = this.normalizeRecommendationSignalKey(type).replace(
      /_/g,
      ' ',
    );
    if (!normalized) {
      return 'Places';
    }
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  private bumpSignal(
    map: WeightedSignalMap,
    key: string | null | undefined,
    label: string | null | undefined,
    amount: number,
  ) {
    const normalizedKey = this.normalizeRecommendationSignalKey(key);
    const cleanLabel = label?.trim();
    if (
      !normalizedKey ||
      !cleanLabel ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return;
    }

    const existing = map.get(normalizedKey);
    if (existing) {
      existing.weight += amount;
      return;
    }

    map.set(normalizedKey, {
      key: normalizedKey,
      label: cleanLabel,
      weight: amount,
    });
  }

  private bumpNumericSignal(
    map: Map<string, number>,
    key: string | null | undefined,
    amount: number,
  ) {
    const normalizedKey = this.normalizeRecommendationSignalKey(key);
    if (!normalizedKey || !Number.isFinite(amount) || amount <= 0) {
      return;
    }
    map.set(normalizedKey, (map.get(normalizedKey) ?? 0) + amount);
  }

  private getSignalWeight(
    map: WeightedSignalMap,
    key: string | null | undefined,
  ) {
    const normalizedKey = this.normalizeRecommendationSignalKey(key);
    if (!normalizedKey) {
      return 0;
    }
    return map.get(normalizedKey)?.weight ?? 0;
  }

  private getTopSignalLabels(map: WeightedSignalMap, limit = 4) {
    return [...map.values()]
      .sort((left, right) => right.weight - left.weight)
      .slice(0, limit)
      .map((signal) => signal.label);
  }

  private extractSnapshotPlaceId(
    snapshot: Record<string, unknown> | null | undefined,
  ) {
    if (!snapshot || typeof snapshot !== 'object') {
      return null;
    }
    const location = snapshot.location;
    if (!location || typeof location !== 'object') {
      return null;
    }
    const placeId = (location as Record<string, unknown>).placeId;
    return typeof placeId === 'string' && placeId.trim()
      ? placeId.trim()
      : null;
  }

  private addPlaceSignals(
    profile: RecommendationProfile,
    place:
      | (Place & {
          city?: { id?: string; name?: string | null } | null;
          provider?: { id?: string; displayName?: string | null } | null;
          tags?: Array<{ id?: string; name?: string | null }>;
        })
      | null
      | undefined,
    baseWeight: number,
  ) {
    if (!place || !Number.isFinite(baseWeight) || baseWeight <= 0) {
      return;
    }

    this.bumpSignal(
      profile.typeSignals,
      place.type,
      this.formatPlaceTypeLabel(place.type),
      baseWeight * 1.2,
    );
    this.bumpSignal(
      profile.citySignals,
      place.city?.id,
      place.city?.name ?? null,
      baseWeight * 1.8,
    );
    this.bumpSignal(
      profile.providerSignals,
      place.provider?.id,
      place.provider?.displayName ?? null,
      baseWeight * 1.25,
    );

    for (const tag of place.tags ?? []) {
      this.bumpSignal(
        profile.tagSignals,
        tag.name,
        tag.name ?? null,
        baseWeight * 2.1,
      );
    }

    profile.totalSignalWeight += baseWeight;
  }

  private createEmptyRecommendationProfile(): RecommendationProfile {
    return {
      tagSignals: new Map(),
      typeSignals: new Map(),
      citySignals: new Map(),
      providerSignals: new Map(),
      excludedPlaceIds: new Set(),
      signalSources: new Set(),
      totalSignalWeight: 0,
    };
  }

  private deriveRecommendationConfidence(
    profile: RecommendationProfile,
  ): 'low' | 'medium' | 'high' {
    if (profile.totalSignalWeight >= 20 || profile.signalSources.size >= 3) {
      return 'high';
    }
    if (profile.totalSignalWeight >= 8 || profile.signalSources.size >= 2) {
      return 'medium';
    }
    return 'low';
  }

  private scoreRecommendedPlace(
    place: Place & {
      city?: { id?: string; name?: string | null } | null;
      provider?: { id?: string; displayName?: string | null } | null;
      tags?: Array<{ name?: string | null }>;
    },
    profile: RecommendationProfile,
  ) {
    const tagScore = (place.tags ?? []).reduce(
      (sum, tag) => sum + this.getSignalWeight(profile.tagSignals, tag.name),
      0,
    );
    const typeScore = this.getSignalWeight(profile.typeSignals, place.type);
    const cityScore = this.getSignalWeight(profile.citySignals, place.city?.id);
    const providerScore = this.getSignalWeight(
      profile.providerSignals,
      place.provider?.id,
    );

    const ratingAverage = Number(place.ratingAverage ?? 0) || 0;
    const ratingCount = Number(place.ratingCount ?? 0) || 0;
    const qualityScore = Math.min(
      40,
      ratingAverage * 5.5 + Math.log10(ratingCount + 1) * 8,
    );

    return (
      tagScore * 2.4 +
      typeScore * 1.5 +
      cityScore * 2.5 +
      providerScore * 1.8 +
      qualityScore +
      (place.isVerified ? 8 : 0) +
      (place.imageUrl ? 1.5 : 0)
    );
  }

  private buildRecommendationReason(
    place: Place & {
      city?: { id?: string; name?: string | null } | null;
      provider?: { id?: string; displayName?: string | null } | null;
      tags?: Array<{ name?: string | null }>;
    },
    profile: RecommendationProfile,
  ): RecommendationReasonBundle {
    const matchedTags = (place.tags ?? [])
      .map((tag) => ({
        label: tag.name?.trim() ?? '',
        weight: this.getSignalWeight(profile.tagSignals, tag.name),
      }))
      .filter((tag) => tag.label && tag.weight > 0)
      .sort((left, right) => right.weight - left.weight)
      .slice(0, 2)
      .map((tag) => tag.label);

    const cityWeight = this.getSignalWeight(
      profile.citySignals,
      place.city?.id,
    );
    const providerWeight = this.getSignalWeight(
      profile.providerSignals,
      place.provider?.id,
    );
    const typeWeight = this.getSignalWeight(profile.typeSignals, place.type);

    const reasons: string[] = [];
    const matchedSignals: string[] = [];

    if (matchedTags.length > 0) {
      reasons.push(`Matches your interest in ${matchedTags.join(' and ')}`);
      matchedSignals.push(...matchedTags);
    }
    if (cityWeight > 0 && place.city?.name) {
      reasons.push(`Fits cities you already explore around ${place.city.name}`);
      matchedSignals.push(place.city.name);
    }
    if (providerWeight > 0 && place.provider?.displayName) {
      reasons.push(`Comes from a provider you already engage with`);
      matchedSignals.push(place.provider.displayName);
    }
    if (typeWeight > 0 && place.type) {
      reasons.push(
        `Strong match for your ${this.formatPlaceTypeLabel(place.type).toLowerCase()} preference`,
      );
      matchedSignals.push(this.formatPlaceTypeLabel(place.type));
    }

    const ratingAverage = Number(place.ratingAverage ?? 0) || 0;
    if (reasons.length === 0 && place.isVerified && ratingAverage >= 4) {
      reasons.push(`Verified and highly rated by travelers`);
    } else if (reasons.length === 0 && ratingAverage >= 4) {
      reasons.push(`Trending with travelers on Waynest`);
    }

    if (reasons.length === 0) {
      reasons.push(`Fresh discovery from the Waynest catalog`);
    }

    return {
      reason: reasons[0],
      reasons: reasons.slice(0, 3),
      matchedSignals: [...new Set(matchedSignals)].slice(0, 4),
    };
  }

  private mapRecommendedPlace(
    place: Place & {
      city?: {
        id?: string;
        name?: string | null;
        country?: { name?: string | null } | null;
      } | null;
      provider?: {
        id?: string;
        displayName?: string | null;
        slug?: string | null;
      } | null;
      tags?: Array<{ id?: string; name?: string | null }>;
    },
    score: number,
    reasonBundle: RecommendationReasonBundle,
  ): RecommendedPlaceItem {
    return {
      id: place.id,
      slug: place.slug,
      name: place.name,
      type: place.type,
      imageUrl: this.mediaService.publicUploadRef(place.imageUrl ?? null),
      description: place.description ?? '',
      ratingAverage: Number(place.ratingAverage ?? 0) || 0,
      ratingCount: Number(place.ratingCount ?? 0) || 0,
      isVerified: Boolean(place.isVerified),
      city: {
        id: place.city?.id ?? null,
        name: place.city?.name ?? null,
        countryName: place.city?.country?.name ?? null,
      },
      provider: {
        id: place.provider?.id ?? null,
        displayName: place.provider?.displayName ?? null,
        slug: place.provider?.slug ?? null,
      },
      tags: (place.tags ?? []).reduce<Array<{ id: string; name: string }>>(
        (acc, tag) => {
          if (!tag?.name) {
            return acc;
          }
          acc.push({
            id: tag.id ?? tag.name,
            name: tag.name,
          });
          return acc;
        },
        [],
      ),
      score: Math.round(score * 100) / 100,
      reason: reasonBundle.reason,
      reasons: reasonBundle.reasons,
      matchedSignals: reasonBundle.matchedSignals,
    };
  }

  private async buildRecommendationProfile(actorId: string) {
    const profile = this.createEmptyRecommendationProfile();

    const [wishlistItems, reactionRows, saveRows, followRows, recentPlans] =
      await Promise.all([
        this.wishlistRepo.find({
          where: { userId: actorId },
          relations: ['place', 'place.tags', 'place.city', 'place.provider'],
          order: { createdAt: 'DESC' },
          take: 16,
        }),
        this.reactionsRepo.find({
          where: { userId: actorId },
          relations: ['post'],
          order: { createdAt: 'DESC' },
          take: 24,
        }),
        this.savesRepo.find({
          where: { userId: actorId },
          relations: ['post'],
          order: { createdAt: 'DESC' },
          take: 24,
        }),
        this.followsRepo.find({
          where: { followerId: actorId },
          select: { followingId: true },
        }),
        this.tripPlansRepo.find({
          where: { userId: actorId },
          relations: ['city'],
          order: { createdAt: 'DESC' },
          take: 8,
        }),
      ]);

    for (const wishlistItem of wishlistItems) {
      if (!wishlistItem.place) {
        continue;
      }
      profile.signalSources.add('wishlist');
      profile.excludedPlaceIds.add(wishlistItem.place.id);
      this.addPlaceSignals(profile, wishlistItem.place, 3.8);
    }

    const interactedPlaceWeights = new Map<string, number>();
    const interactedTripWeights = new Map<string, number>();
    const interactedProviderWeights = new Map<string, number>();

    for (const reaction of reactionRows) {
      const post = reaction.post;
      if (!post) {
        continue;
      }
      profile.signalSources.add('likes');
      this.bumpNumericSignal(
        interactedPlaceWeights,
        this.extractSnapshotPlaceId(post.snapshot),
        1.7,
      );
      this.bumpNumericSignal(interactedTripWeights, post.tripPlanId, 1.4);
      this.bumpNumericSignal(interactedProviderWeights, post.providerId, 1.3);
    }

    for (const save of saveRows) {
      const post = save.post;
      if (!post) {
        continue;
      }
      profile.signalSources.add('saved-posts');
      this.bumpNumericSignal(
        interactedPlaceWeights,
        this.extractSnapshotPlaceId(post.snapshot),
        2.6,
      );
      this.bumpNumericSignal(interactedTripWeights, post.tripPlanId, 2);
      this.bumpNumericSignal(interactedProviderWeights, post.providerId, 1.8);
    }

    const followedOwnerIds = followRows
      .map((row) => row.followingId)
      .filter((value): value is string => Boolean(value));

    const [
      interactedPlaces,
      interactedTrips,
      interactedProviders,
      followedProviders,
    ] = await Promise.all([
      interactedPlaceWeights.size > 0
        ? this.placesRepo.find({
            where: { id: In([...interactedPlaceWeights.keys()]) },
            relations: ['tags', 'city', 'provider'],
          })
        : Promise.resolve([]),
      interactedTripWeights.size > 0
        ? this.tripPlansRepo.find({
            where: { id: In([...interactedTripWeights.keys()]) },
            relations: ['city'],
          })
        : Promise.resolve([]),
      interactedProviderWeights.size > 0
        ? this.providersRepo.find({
            where: {
              id: In([...interactedProviderWeights.keys()]),
              isActive: true,
            },
            relations: ['city'],
          })
        : Promise.resolve([]),
      followedOwnerIds.length > 0
        ? this.providersRepo.find({
            where: { ownerUserId: In(followedOwnerIds), isActive: true },
            relations: ['city'],
          })
        : Promise.resolve([]),
    ]);

    for (const place of interactedPlaces) {
      this.addPlaceSignals(
        profile,
        place,
        interactedPlaceWeights.get(
          this.normalizeRecommendationSignalKey(place.id),
        ) ?? 0,
      );
    }

    for (const trip of interactedTrips) {
      if (!trip.city?.id || !trip.city?.name) {
        continue;
      }
      this.bumpSignal(profile.citySignals, trip.city.id, trip.city.name, 2.2);
      profile.totalSignalWeight +=
        interactedTripWeights.get(
          this.normalizeRecommendationSignalKey(trip.id),
        ) ?? 0;
    }

    for (const provider of interactedProviders) {
      this.bumpSignal(
        profile.providerSignals,
        provider.id,
        provider.displayName,
        interactedProviderWeights.get(
          this.normalizeRecommendationSignalKey(provider.id),
        ) ?? 0,
      );
      this.bumpSignal(
        profile.citySignals,
        provider.city?.id,
        provider.city?.name ?? null,
        1.1,
      );
      profile.totalSignalWeight +=
        interactedProviderWeights.get(
          this.normalizeRecommendationSignalKey(provider.id),
        ) ?? 0;
    }

    for (const provider of followedProviders) {
      profile.signalSources.add('following');
      this.bumpSignal(
        profile.providerSignals,
        provider.id,
        provider.displayName,
        2.4,
      );
      this.bumpSignal(
        profile.citySignals,
        provider.city?.id,
        provider.city?.name ?? null,
        1.5,
      );
      profile.totalSignalWeight += 2.4;
    }

    for (const trip of recentPlans) {
      if (!trip.city?.id || !trip.city?.name) {
        continue;
      }
      profile.signalSources.add('trip-plans');
      this.bumpSignal(profile.citySignals, trip.city.id, trip.city.name, 1.9);
      profile.totalSignalWeight += 1.9;
    }

    return profile;
  }

  async listPlaceRecommendations(
    actorId: string | null,
    limit = 6,
  ): Promise<RecommendedPlacesResponse> {
    const safeLimit = Math.max(1, Math.min(limit, 12));

    const candidates = await this.placesRepo.find({
      where: { isActive: true },
      relations: ['city', 'city.country', 'provider', 'tags'],
      order: {
        isVerified: 'DESC',
        ratingAverage: 'DESC',
        ratingCount: 'DESC',
        createdAt: 'DESC',
      },
      take: actorId ? 220 : Math.max(24, safeLimit * 8),
    });

    if (candidates.length === 0) {
      return {
        source: 'trending',
        profile: {
          confidence: 'low',
          topTags: [],
          topTypes: [],
          topCities: [],
          topProviders: [],
        },
        items: [],
      };
    }

    const profile = actorId
      ? await this.buildRecommendationProfile(actorId)
      : this.createEmptyRecommendationProfile();
    const hasPersonalSignals = profile.signalSources.size > 0;

    const filteredPool = candidates.filter(
      (place) => !profile.excludedPlaceIds.has(place.id),
    );
    const pool = filteredPool.length > 0 ? filteredPool : candidates;
    const scoredItems = pool
      .map((place) => {
        const score = hasPersonalSignals
          ? this.scoreRecommendedPlace(place, profile)
          : Math.min(
              42,
              (Number(place.ratingAverage ?? 0) || 0) * 6 +
                Math.log10((Number(place.ratingCount ?? 0) || 0) + 1) * 9 +
                (place.isVerified ? 6 : 0),
            );
        const reasonBundle = hasPersonalSignals
          ? this.buildRecommendationReason(place, profile)
          : {
              reason:
                Number(place.ratingAverage ?? 0) >= 4
                  ? 'Trending with travelers on Waynest'
                  : 'Fresh discovery from the Waynest catalog',
              reasons: [
                Number(place.ratingAverage ?? 0) >= 4
                  ? 'Trending with travelers on Waynest'
                  : 'Fresh discovery from the Waynest catalog',
                place.isVerified
                  ? 'Verified listing with trusted place data'
                  : 'Worth exploring in the public catalog',
              ].filter(Boolean),
              matchedSignals: [],
            };

        return {
          place,
          score,
          reasonBundle,
        };
      })
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        const ratingDiff =
          (Number(right.place.ratingAverage ?? 0) || 0) -
          (Number(left.place.ratingAverage ?? 0) || 0);
        if (ratingDiff !== 0) {
          return ratingDiff;
        }
        return (
          (Number(right.place.ratingCount ?? 0) || 0) -
          (Number(left.place.ratingCount ?? 0) || 0)
        );
      })
      .slice(0, safeLimit);

    return {
      source: hasPersonalSignals ? 'personalized' : 'trending',
      profile: {
        confidence: this.deriveRecommendationConfidence(profile),
        topTags: this.getTopSignalLabels(profile.tagSignals),
        topTypes: this.getTopSignalLabels(profile.typeSignals),
        topCities: this.getTopSignalLabels(profile.citySignals),
        topProviders: this.getTopSignalLabels(profile.providerSignals),
      },
      items: scoredItems.map(({ place, score, reasonBundle }) =>
        this.mapRecommendedPlace(place, score, reasonBundle),
      ),
    };
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

    // Determine visibility: if posting a trip plan, inherit its shareVisibility
    let vis = dto.visibility ?? SocialPostVisibility.PUBLIC;

    if (linkedTrip) {
      // Trip plan posts must respect the plan's shareVisibility
      const tripShareVis =
        linkedTrip.shareVisibility === 'FRIENDS'
          ? SocialPostVisibility.FRIENDS
          : SocialPostVisibility.PUBLIC;

      if (dto.visibility && dto.visibility !== tripShareVis) {
        throw new BadRequestException(
          'Post visibility must match trip plan shareVisibility',
        );
      }
      vis = tripShareVis;
    }

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

    // FRIENDS-visibility posts appear only in the "following" tab
    if (filter === 'for-you') {
      query.andWhere('post.visibility != :excludeFriendsVis', {
        excludeFriendsVis: SocialPostVisibility.FRIENDS,
      });
    }

    if (filter === 'following') {
      if (!actorId) {
        return { data: [], nextCursor: null, hasMore: false };
      }

      const visibleIds = new Set(followRows.map((item) => item.followingId));

      // Also include friends so FRIENDS-visibility posts appear here
      const [fLow, fHigh] = await Promise.all([
        this.friendshipRepo.find({
          where: { userLowId: actorId, status: FriendshipStatus.ACCEPTED },
          select: { userLowId: true, userHighId: true },
        }),
        this.friendshipRepo.find({
          where: { userHighId: actorId, status: FriendshipStatus.ACCEPTED },
          select: { userLowId: true, userHighId: true },
        }),
      ]);
      for (const r of [...fLow, ...fHigh]) {
        visibleIds.add(r.userLowId === actorId ? r.userHighId : r.userLowId);
      }

      if (visibleIds.size === 0) {
        return { data: [], nextCursor: null, hasMore: false };
      }

      query.andWhere('post.authorId IN (:...followingIds)', {
        followingIds: [...visibleIds],
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

  async listComments(
    postId: string,
    actorId?: string | null,
    limit = 20,
    cursor?: string,
  ) {
    await this.getPostById(postId, actorId);
    const safeLimit = Math.max(1, Math.min(limit, 50));
    const cursorToken = decodeCursor(cursor);

    const query = this.commentsRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.author', 'author')
      .where('c.postId = :postId', { postId })
      .orderBy('c.createdAt', 'ASC')
      .addOrderBy('c.id', 'ASC');

    if (cursorToken) {
      query.andWhere(
        new Brackets((subQuery) => {
          subQuery
            .where('c.createdAt > :cursorCreatedAt', {
              cursorCreatedAt: cursorToken.createdAt,
            })
            .orWhere('(c.createdAt = :cursorCreatedAt AND c.id > :cursorId)', {
              cursorCreatedAt: cursorToken.createdAt,
              cursorId: cursorToken.id,
            });
        }),
      );
    }

    const rows = await query.take(safeLimit + 1).getMany();
    const hasMore = rows.length > safeLimit;
    const pageRows = hasMore ? rows.slice(0, safeLimit) : rows;

    const enriched = pageRows.map((c) => {
      const plain = instanceToPlain(c) as Record<string, unknown>;
      const merged = {
        ...plain,
        author: this.normalizeAuthorAvatarInPlain(plain.author),
      };
      return merged;
    });

    return {
      data: enriched,
      nextCursor:
        hasMore && pageRows.length > 0
          ? encodeCursor(pageRows[pageRows.length - 1])
          : null,
      hasMore,
    };
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
