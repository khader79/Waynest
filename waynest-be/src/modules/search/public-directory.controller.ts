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

/** Stable public metadata for profile shells (no raw UUID in URLs). */
@Controller('public')
export class PublicDirectoryController {
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
    const user = await this.friendshipService.findUserByUsernameOrId(param);
    let providerSlug: string | null = null;
    if (user.role === UserRole.PROVIDER) {
      providerSlug = await this.providersService.findSlugByOwnerUserId(user.id);
    }
    const [followersCount, followingCount] = await Promise.all([
      this.socialGraphService.countFollowers(user.id),
      this.socialGraphService.countFollowing(user.id),
    ]);
    const friendsCount = await this.friendshipService.countAcceptedFriends(
      user.id,
    );
    if (process.env.DEBUG_FRIENDS === 'true') {
      // eslint-disable-next-line no-console
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
  }

  @Get('users/:param/followers')
  async publicFollowers(@Param('param') param: string, @Query('q') q?: string) {
    const user = await this.friendshipService.findUserByUsernameOrId(param);
    return this.socialGraphService.listFollowersForSelf(user.id, q);
  }

  @Get('users/:param/following')
  async publicFollowing(@Param('param') param: string, @Query('q') q?: string) {
    const user = await this.friendshipService.findUserByUsernameOrId(param);
    return this.socialGraphService.listFollowingForSelf(user.id, q);
  }

  @Get('users/:param/friends')
  async publicFriends(@Param('param') param: string, @Query('q') q?: string) {
    const user = await this.friendshipService.findUserByUsernameOrId(param);
    return this.friendshipService.listFriends(user.id, q);
  }
}
