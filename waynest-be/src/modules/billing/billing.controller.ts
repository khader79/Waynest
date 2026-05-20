import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('billing')
export class BillingController {
  constructor(private billing: BillingService) {}

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
  async createCheckoutSession(
    @Req() req: any,
    @Body() body: { planId: string },
  ) {
    return this.billing.createCheckoutSession(req.user.id, body.planId);
  }

  @Post('webhook')
  @HttpCode(200)
  async webhook(@Req() req: any) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new HttpException(
        { messageKey: 'errors.api.missingWebhookBody' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const payload = {
      body: rawBody,
      headers: req.headers,
    };
    const result = await this.billing
      .getBillingAdapter()
      .handleWebhook(payload);
    if (!result.success) {
      throw new HttpException(
        { messageKey: 'errors.api.webhookProcessingFailed' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return result;
  }
}
