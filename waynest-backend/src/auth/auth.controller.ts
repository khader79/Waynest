import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CheckEmailDto } from './Dtos/check-email.dro';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('check-email')
  checkEmail(@Body() body: CheckEmailDto) {
    return this.authService.emailFound(body.email);
  }
}
