import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';

@Controller('email-verification')
export class EmailVerificationController {
  constructor(private readonly emailVerificationService: EmailVerificationService) {}

  @Get('verify')
  async verify(@Query('token') token?: string) {
    if (!token) throw new BadRequestException('Token is required');

    await this.emailVerificationService.verifyEmail(token);

    return { message: 'Email verified successfully' };
  }
}
