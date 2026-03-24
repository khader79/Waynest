import { Controller, Get, Param } from '@nestjs/common';
import { FriendshipService } from '../social-graph/friendship.service';
import { ProvidersService } from '../providers/providers.service';
import { UserRole } from '../users/entities/user.entity';

/** Stable public metadata for profile shells (no raw UUID in URLs). */
@Controller('public')
export class PublicDirectoryController {
  constructor(
    private readonly friendshipService: FriendshipService,
    private readonly providersService: ProvidersService,
  ) {}

  @Get('users/:param')
  async userCard(@Param('param') param: string) {
    const user = await this.friendshipService.findUserByUsernameOrId(param);
    let providerSlug: string | null = null;
    if (user.role === UserRole.PROVIDER) {
      providerSlug = await this.providersService.findSlugByOwnerUserId(user.id);
    }
    return {
      avatarUrl: user.avatarUrl ?? null,
      firstName: user.firstName,
      lastName: user.lastName,
      providerSlug,
      role: user.role,
      username: user.username,
    };
  }
}
