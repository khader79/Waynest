import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('plans')
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
}
