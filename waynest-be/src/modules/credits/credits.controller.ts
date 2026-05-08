import { Controller, Get, UseGuards, Req, Post, Body } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CreditEngineService } from './credit-engine.service';

@Controller('credits')
export class CreditsController {
  constructor(
    private svc: CreditsService,
    private engine: CreditEngineService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return this.svc.getWalletForUser(req.user.id);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  txs(@Req() req: any) {
    return this.svc.listTransactions(req.user.id);
  }

  @Post('charge')
  @UseGuards(JwtAuthGuard)
  async charge(
    @Req() req: any,
    @Body() body: { amount: number; feature?: string },
  ) {
    return this.engine.charge(req.user.id, body.amount, {
      feature: body.feature,
    });
  }
}
