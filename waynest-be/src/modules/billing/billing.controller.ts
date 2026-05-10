import { Controller, Get, Post, Body, UseGuards, Req, Headers, HttpCode } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BILLING_ADAPTER, BillingProvider } from './billing-adapter';

@Controller('billing')
export class BillingController {
  constructor(
    private billing: BillingService,
  ) {}

  @Post('upgrade')
  @UseGuards(JwtAuthGuard)
  async upgrade(@Req() req: any, @Body() body: { planId: string }) {
    await this.billing.upgradeUserPlan(req.user.id, body.planId);
    return { message: 'Plan upgraded' };
  }

  @Post('downgrade')
  @UseGuards(JwtAuthGuard)
  async downgrade(@Req() req: any, @Body() body: { planId: string }) {
    await this.billing.downgradeUserPlan(req.user.id, body.planId);
    return { message: 'Plan downgraded' };
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(@Req() req: any) {
    await this.billing.cancelSubscription(req.user.id);
    return { message: 'Subscription cancelled' };
  }

  @Post('reactivate')
  @UseGuards(JwtAuthGuard)
  async reactivate(@Req() req: any) {
    await this.billing.reactivateSubscription(req.user.id);
    return { message: 'Subscription reactivated' };
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async history(@Req() req: any) {
    return this.billing.getUserBillingHistory(req.user.id);
  }

  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(@Req() req: any, @Body() body: { planId: string }) {
    return this.billing.createCheckoutSession(req.user.id, body.planId);
  }

  @Post('webhook')
  @HttpCode(200)
  async webhook(@Req() req: any) {
    // StripeAdapter.handleWebhook reads req.body and stripe-signature header
    const payload = {
      body: (req as any).rawBody || req.body,
      headers: req.headers,
    };
    const result = await this.billing.getBillingAdapter().handleWebhook(payload);
    return result;
  }
}
