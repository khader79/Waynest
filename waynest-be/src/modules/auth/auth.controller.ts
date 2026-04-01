import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login with email/username + password' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
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
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
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
