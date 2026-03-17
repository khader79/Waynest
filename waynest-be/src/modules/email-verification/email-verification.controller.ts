import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';

@Controller('email-verification')
export class EmailVerificationController {
  constructor(
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  @Post('verify')
  async verify(@Body('code') code: string) {
    if (!code) throw new BadRequestException('Verification code is required');

    await this.emailVerificationService.verifyEmail(code);

    return { message: 'Email verified successfully' };
  }
}
