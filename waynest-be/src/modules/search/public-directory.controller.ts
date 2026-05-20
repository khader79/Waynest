import { Controller, Get, Param, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FriendshipService } from '../social-graph/friendship.service';
import { SocialGraphService } from '../social-graph/social-graph.service';
import { ProvidersService } from '../providers/providers.service';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { Place } from '../place/entities/place.entity';
import { Country } from '../countries/entities/country.entity';
import { MediaService } from '../upload/media.service';
import { TripPlan } from '../../trip-planner/entities/trip-planner.entity';
import { HotPathCache } from 'src/common/utils/hot-path-cache';

/** Stable public metadata for profile shells (no raw UUID in URLs). */
@Controller('public')
export class PublicDirectoryController {
  private readonly readCache = new HotPathCache(400);

  private landingStatsCache: {
    expiresAt: number;
    value: {
      usersCount: number;
      placesCount: number;
      countriesCount: number;
      publicPlansCount: number;
    };
  } | null = null;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Place)
    private readonly placeRepo: Repository<Place>,
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,
    @InjectRepository(TripPlan)
    private readonly tripPlanRepo: Repository<TripPlan>,
    private readonly friendshipService: FriendshipService,
    private readonly socialGraphService: SocialGraphService,
    private readonly providersService: ProvidersService,
    private readonly mediaService: MediaService,
  ) {}

  private cacheTtlMs(name: string, fallback: number): number {
    const raw = Number(process.env[name]);
    return Number.isFinite(raw) && raw > 0 ? raw : fallback;
  }

  private publicCardCacheTtlMs() {
    return this.cacheTtlMs('PUBLIC_USER_CARD_CACHE_MS', 10_000);
  }

  private publicConnectionsCacheTtlMs() {
    return this.cacheTtlMs('PUBLIC_USER_CONNECTIONS_CACHE_MS', 8_000);
  }

  @Get('landing-stats')
  async landingStats() {
    const now = Date.now();
    if (this.landingStatsCache && this.landingStatsCache.expiresAt > now) {
      return this.landingStatsCache.value;
    }

    const [usersCount, placesCount, countriesCount, publicPlansCount] =
      await Promise.all([
        this.userRepo.count({ where: { status: UserStatus.ACTIVE } }),
        this.placeRepo.count({ where: { isActive: true } }),
        this.countryRepo.count(),
        this.tripPlanRepo
          .createQueryBuilder('plan')
          .where('plan.isPublic = :pub', { pub: true })
          .andWhere('plan.shareSlug IS NOT NULL')
          .andWhere("plan.shareSlug != ''")
          .andWhere('plan.userId IS NOT NULL')
          .getCount(),
      ]);

    const value = {
      usersCount,
      placesCount,
      countriesCount,
      publicPlansCount,
    };

    this.landingStatsCache = {
      expiresAt: now + 60_000,
      value,
    };

    return value;
  }

  @Get('users/:param')
  async userCard(@Param('param') param: string) {
    const cacheKey = `public:user-card:${param.trim().toLowerCase()}`;
    return this.readCache.getOrSet(
      cacheKey,
      this.publicCardCacheTtlMs(),
      async () => {
        const user = await this.friendshipService.findUserByUsernameOrId(param);
        let providerSlug: string | null = null;
        if (user.role === UserRole.PROVIDER) {
          providerSlug = await this.providersService.findSlugByOwnerUserId(
            user.id,
          );
        }
        const [followersCount, followingCount] = await Promise.all([
          this.socialGraphService.countFollowers(user.id),
          this.socialGraphService.countFollowing(user.id),
        ]);
        const friendsCount = await this.friendshipService.countAcceptedFriends(
          user.id,
        );
        if (process.env.DEBUG_FRIENDS === 'true') {
          console.log(
            `[DEBUG] public.userCard user=${user.username} id=${user.id} friendsCount=${friendsCount}`,
          );
        }
        return {
          avatarUrl: this.mediaService.publicUploadRef(user.avatarUrl),
          firstName: user.firstName,
          lastName: user.lastName,
          providerSlug,
          role: user.role,
          username: user.username,
          followersCount,
          friendsCount,
          followingCount,
        };
      },
    );
  }

  @Get('users/:param/followers')
  async publicFollowers(@Param('param') param: string, @Query('q') q?: string) {
    const cacheKey = `public:user-followers:${param.trim().toLowerCase()}:${(q ?? '').trim().toLowerCase()}`;
    return this.readCache.getOrSet(
      cacheKey,
      this.publicConnectionsCacheTtlMs(),
      async () => {
        const user = await this.friendshipService.findUserByUsernameOrId(param);
        return this.socialGraphService.listFollowersForSelf(user.id, q);
      },
    );
  }

  @Get('users/:param/following')
  async publicFollowing(@Param('param') param: string, @Query('q') q?: string) {
    const cacheKey = `public:user-following:${param.trim().toLowerCase()}:${(q ?? '').trim().toLowerCase()}`;
    return this.readCache.getOrSet(
      cacheKey,
      this.publicConnectionsCacheTtlMs(),
      async () => {
        const user = await this.friendshipService.findUserByUsernameOrId(param);
        return this.socialGraphService.listFollowingForSelf(user.id, q);
      },
    );
  }

  @Get('users/:param/friends')
  async publicFriends(@Param('param') param: string, @Query('q') q?: string) {
    const cacheKey = `public:user-friends:${param.trim().toLowerCase()}:${(q ?? '').trim().toLowerCase()}`;
    return this.readCache.getOrSet(
      cacheKey,
      this.publicConnectionsCacheTtlMs(),
      async () => {
        const user = await this.friendshipService.findUserByUsernameOrId(param);
        return this.friendshipService.listFriends(user.id, q);
      },
    );
  }
}
