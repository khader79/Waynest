import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EmailVerificationService } from './email-verification.service';

@Controller('email-verification')
export class EmailVerificationController {
  constructor(
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  @Post('verify')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verify(@Body('code') code: string) {
    if (!code) throw new BadRequestException('Verification code is required');

    await this.emailVerificationService.verifyEmail(code);

    return { message: 'Email verified successfully' };
  }

  @Post('resend')
  @Throttle({ default: { limit: 4, ttl: 60_000 } })
  async resend(@Body('identifier') identifier: string) {
    if (!identifier) {
      throw new BadRequestException('Identifier is required');
    }

    await this.emailVerificationService.resendVerification(identifier);

    return { message: 'Verification code sent' };
  }
}
