import { Controller, Get, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SocialGraphService } from './social-graph.service';

type AuthRequest = {
  user: {
    sub: string;
  };
};

@Controller('social-graph')
@UseGuards(JwtAuthGuard)
export class SocialGraphController {
  constructor(private readonly socialGraphService: SocialGraphService) {}

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
}

