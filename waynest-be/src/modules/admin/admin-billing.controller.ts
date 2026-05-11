import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/modules/auth/guards/role.guard';
import { Roles } from 'src/modules/auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { BillingService } from '../billing/billing.service';
import { CreditEngineService } from '../credits/credit-engine.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PlanSeeder } from './seeders/plan.seeder';
import { AuditLogService } from '../../common/services/audit-log.service';

@Controller('admin/billing')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(UserRole.ADMIN)
export class AdminBillingController {
  constructor(
    private billing: BillingService,
    private credits: CreditEngineService,
    private subs: SubscriptionsService,
    private seeder: PlanSeeder,
    private audit: AuditLogService,
  ) {}

  @Post('seed-plans')
  async seedPlans() {
    await this.seeder.seed();
    return { message: 'Plans seeded' };
  }

  @Get('plans')
  async listPlans() {
    return this.subs.listPlans();
  }

  @Post('users/:userId/upgrade')
  async upgradeUser(
    @Param('userId') userId: string,
    @Body() body: { planId: string },
    @Req() req: any,
  ) {
    await this.billing.upgradeUserPlan(userId, body.planId, req.user);
    return { message: 'User upgraded' };
  }

  @Post('users/:userId/cancel-subscription')
  async cancelSub(@Param('userId') userId: string, @Req() req: any) {
    await this.billing.cancelSubscription(userId, req.user);
    return { message: 'Subscription cancelled' };
  }

  @Post('users/:userId/grant-credits')
  async grantCredits(
    @Param('userId') userId: string,
    @Body() body: { amount: number; reason?: string },
    @Req() req: any,
  ) {
    await this.credits.grant(
      userId,
      body.amount,
      {},
      body.reason || 'admin grant',
    );
    await this.audit.log(
      'GRANT_CREDITS',
      'USER',
      userId,
      req.user,
      { amount: body.amount },
      body.reason,
    );
    return { message: 'Credits granted' };
  }

  @Get('users/:userId/balance')
  async getUserBalance(@Param('userId') userId: string) {
    const balance = await this.credits.getBalance(userId);
    const available = await this.credits.getAvailableBalance(userId);
    return { balance, available };
  }

  @Get('users/:userId/billing-history')
  async userHistory(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.billing.getUserBillingHistory(
      userId,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('audit-logs')
  async auditLogs(
    @Query() filters: { targetType?: string; action?: string; limit?: string },
  ) {
    return this.audit.getLogs({
      ...filters,
      limit: filters.limit ? parseInt(filters.limit) : 100,
    });
  }
}
