import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SocialGraphService } from './social-graph.service';
import { FriendshipService } from './friendship.service';
import { RequestFriendDto } from './dto/request-friend.dto';

type AuthRequest = {
  user: {
    sub: string;
  };
};

@Controller('social-graph')
@UseGuards(JwtAuthGuard)
export class SocialGraphController {
  constructor(
    private readonly socialGraphService: SocialGraphService,
    private readonly friendshipService: FriendshipService,
  ) {}

  @Get('me/connection-counts')
  async getMyConnectionCounts(@Request() req: AuthRequest) {
    const userId = req.user.sub;
    const [friendsCount, followersCount, followingCount] = await Promise.all([
      this.friendshipService.countAcceptedFriends(userId),
      this.socialGraphService.countFollowers(userId),
      this.socialGraphService.countFollowing(userId),
    ]);
    if (process.env.DEBUG_FRIENDS === 'true') {
      // eslint-disable-next-line no-console
      console.log(
        `[DEBUG] social-graph.getMyConnectionCounts user=${userId} friendsCount=${friendsCount} followersCount=${followersCount} followingCount=${followingCount}`,
      );
    }
    return { friendsCount, followersCount, followingCount };
  }

  @Get('me/followers')
  listMyFollowers(@Request() req: AuthRequest, @Query('q') q?: string) {
    return this.socialGraphService.listFollowersForSelf(req.user.sub, q);
  }

  @Get('me/following')
  listMyFollowing(@Request() req: AuthRequest, @Query('q') q?: string) {
    return this.socialGraphService.listFollowingForSelf(req.user.sub, q);
  }

  @Get('users/:id/state')
  getState(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.socialGraphService.getGraphState(req.user.sub, id);
  }

  @Patch('users/:id/follow')
  follow(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.socialGraphService.followUser(req.user.sub, id);
  }

  @Patch('users/:id/unfollow')
  unfollow(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.socialGraphService.unfollowUser(req.user.sub, id);
  }

  @Patch('users/:id/block')
  block(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.socialGraphService.blockUser(req.user.sub, id);
  }

  @Patch('users/:id/unblock')
  unblock(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.socialGraphService.unblockUser(req.user.sub, id);
  }

  @Patch('users/:id/mute')
  mute(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.socialGraphService.muteUser(req.user.sub, id);
  }

  @Patch('users/:id/unmute')
  unmute(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.socialGraphService.unmuteUser(req.user.sub, id);
  }

  @Post('friends/request')
  requestFriend(@Request() req: AuthRequest, @Body() dto: RequestFriendDto) {
    return this.friendshipService.requestByUsername(req.user.sub, dto.username);
  }

  @Get('friends/incoming')
  listIncoming(@Request() req: AuthRequest) {
    return this.friendshipService.listIncoming(req.user.sub);
  }

  @Get('friends')
  listFriends(@Request() req: AuthRequest, @Query('q') q?: string) {
    return this.friendshipService.listFriends(req.user.sub, q);
  }

  @Patch('friends/:requesterId/accept')
  acceptFriend(
    @Request() req: AuthRequest,
    @Param('requesterId') requesterId: string,
  ) {
    return this.friendshipService.accept(req.user.sub, requesterId);
  }

  @Patch('friends/:requesterId/decline')
  declineFriend(
    @Request() req: AuthRequest,
    @Param('requesterId') requesterId: string,
  ) {
    return this.friendshipService.decline(req.user.sub, requesterId);
  }

  @Delete('friends/:friendId')
  removeFriend(
    @Request() req: AuthRequest,
    @Param('friendId') friendId: string,
  ) {
    return this.friendshipService.removeFriend(req.user.sub, friendId);
  }

  @Get('friends/state/:targetUserId')
  friendState(
    @Request() req: AuthRequest,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.friendshipService.getState(req.user.sub, targetUserId);
  }

  @Get('friends/state-by-username/:username')
  async friendStateByUsername(
    @Request() req: AuthRequest,
    @Param('username') username: string,
  ) {
    const user = await this.friendshipService.findUserByUsernameOrId(username);
    return {
      ...((await this.friendshipService.getState(
        req.user.sub,
        user.id,
      )) as object),
      targetUserId: user.id,
    };
  }

  @Get('debug/friends/:userId')
  async debugFriends(@Param('userId') userId: string) {
    if (process.env.DEBUG_FRIENDS !== 'true') {
      throw new ForbiddenException('Debug endpoint disabled');
    }
    const rows = await this.friendshipService.debugAcceptedFriendRows(userId);
    return { count: rows.length, rows };
  }
}
