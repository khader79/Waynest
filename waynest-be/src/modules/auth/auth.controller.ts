import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { ActivateInviteDto } from './dto/activate-invite.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UsersService } from '../users/users.service';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';

type AuthUserRequest = {
  user: {
    sub: string;
  };
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @ApiOperation({ summary: 'Login with email/username + password' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.login(loginDto);

    res.cookie('access_token', session.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return session;
  }

  @ApiOperation({ summary: 'Register a new user account' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /** Current-user profile lives under /auth/* to avoid any /users route shadowing. */
  @ApiOperation({ summary: 'Dashboard counts for current user' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('me/summary')
  getMeSummary(@Request() req: AuthUserRequest) {
    return this.usersService.getMeSummary(req.user.sub);
  }

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req: AuthUserRequest) {
    return this.usersService.findMe(req.user.sub);
  }

  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Request() req: AuthUserRequest, @Body() dto: UpdateProfileDto) {
    return this.usersService.update(req.user.sub, dto);
  }

  @ApiOperation({ summary: 'Get current JWT payload (requires auth)' })
  @ApiBearerAuth('access-token')
  @Get('getPayload')
  @UseGuards(JwtAuthGuard)
  getPayload(@Request() req) {
    return req.user;
  }

  // ── Invite System ────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Create an invite token (Admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  async createInvite(@Body() dto: CreateInviteDto) {
    return this.authService.createInvite(dto);
  }

  @ApiOperation({ summary: 'Activate an invite token' })
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('invite/activate')
  @HttpCode(HttpStatus.OK)
  async activateInvite(@Body() dto: ActivateInviteDto) {
    return this.authService.activateInvite(dto);
  }

  @ApiOperation({ summary: 'Admin test endpoint' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin/test')
  async adminTest() {
    return { message: 'Admin access granted' };
  }
}
