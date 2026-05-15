import { Controller, Get, UseGuards, Req, Post, Param } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/modules/auth/guards/role.guard';
import { Roles } from 'src/modules/auth/roles.decorator';
import { UserRole } from 'src/modules/users/entities/user.entity';

@Controller('subscriptions/plans')
export class SubscriptionsController {
  constructor(private svc: SubscriptionsService) {}

  @Get()
  list() {
    return this.svc.listPlans();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return this.svc.getActiveSubscriptionForUser(req.user.id);
  }

  // Admin-only: trigger monthly grant for a specific user (dev/admin use)
  @Post('admin/grant-monthly/:userId')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  grantForUser(@Param('userId') userId: string) {
    return this.svc.grantMonthlyCreditsForUser(userId);
  }

  // Admin-only: trigger monthly grants for all active subscriptions
  @Post('admin/grant-monthly')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  grantForAll() {
    return this.svc.grantMonthlyCreditsForAll();
  }
}
