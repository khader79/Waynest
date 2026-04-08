import { Controller, Get, Param, Query } from '@nestjs/common';
import { FriendshipService } from '../social-graph/friendship.service';
import { SocialGraphService } from '../social-graph/social-graph.service';
import { ProvidersService } from '../providers/providers.service';
import { UserRole } from '../users/entities/user.entity';
import { MediaService } from '../upload/media.service';

/** Stable public metadata for profile shells (no raw UUID in URLs). */
@Controller('public')
export class PublicDirectoryController {
  constructor(
    private readonly friendshipService: FriendshipService,
    private readonly socialGraphService: SocialGraphService,
    private readonly providersService: ProvidersService,
    private readonly mediaService: MediaService,
  ) {}

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
}
