import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CheckEmailDto } from './Dtos/check-email.dro';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('adminlogin')
  login(@Body() body: { username: string; password: string }) {
    return this.authService.login(body.username, body.password);
  }

  @Post('check-email')
  checkEmail(@Body() body: CheckEmailDto) {
    return this.authService.emailFound(body.email);
  }

  @Post('userslogin')
  usersLogin(@Body() body) {
    return this.authService.usersLogin(body.email, body.password);
  }
}
