import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import express from 'express';
import type { CookieOptions } from 'express';
import { SignUpDto } from './dto/signup.dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

// NOTE:
// - For local / HTTP deployments we cannot use `secure: true` or `sameSite: 'none'`
//   because browsers reject such cookies over plain HTTP.
// - We therefore control "secure cookie" behavior via an env flag:
//   USE_SECURE_COOKIES=true  -> use Secure + SameSite=None (for HTTPS)
//   USE_SECURE_COOKIES unset -> use non-secure cookies (for HTTP)
const useSecureCookies =
  typeof process.env.USE_SECURE_COOKIES === 'string' &&
  process.env.USE_SECURE_COOKIES.toLowerCase() === 'true';

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: useSecureCookies,
  sameSite: useSecureCookies ? 'none' : 'lax',
  maxAge: 1000 * 60 * 60 * 24,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(
    @Body() loginDto: LoginDto,
    @Headers('x-device-fingerprint') deviceFingerprint: string,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const access_token = await this.authService.signIn(
      loginDto,
      deviceFingerprint,
    );

    res.cookie('access_token', access_token.access_token, COOKIE_OPTIONS);

    return {
      message: 'Logged in successfully',
      access_token: access_token.access_token,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: express.Response) {
    res.clearCookie('access_token', COOKIE_OPTIONS);
    return { message: 'Logged out successfully' };
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('signup')
  signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('getPayload')
  getPayload(@Req() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/devices')
  async getAdminDevices(@Req() req: any) {
    this.ensureAdmin(req.user);
    const devices = await this.usersService.getAllowedDevices(req.user.userId);
    return { devices };
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/devices')
  async addAdminDevice(
    @Req() req: any,
    @Body() body: { fingerprint?: string; label?: string },
  ) {
    this.ensureAdmin(req.user);

    if (!body?.fingerprint) {
      throw new BadRequestException('Fingerprint is required');
    }

    const devices = await this.usersService.updateAllowedDevices(
      req.user.userId,
      body.fingerprint,
    );

    return { devices };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/devices')
  async deleteAdminDevice(
    @Req() req: any,
    @Body() body: { fingerprint?: string },
  ) {
    this.ensureAdmin(req.user);

    if (!body?.fingerprint) {
      throw new BadRequestException('Fingerprint is required');
    }

    const devices = await this.usersService.removeAllowedDevice(
      req.user.userId,
      body.fingerprint,
    );

    return { devices };
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/invite')
  async createInvite(@Req() req: any) {
    this.ensureAdmin(req.user);
    return this.authService.createInviteToken();
  }

  @Post('join')
  async joinWithInvite(
    @Body('token') token: string,
    @Headers('x-device-fingerprint') fingerprint: string,
  ) {
    if (!token) {
      throw new BadRequestException('Token is required.');
    }

    if (!fingerprint) {
      throw new BadRequestException('Device fingerprint missing.');
    }

    await this.authService.acceptInvite(token, fingerprint);

    return { success: true };
  }

  private ensureAdmin(user: any) {
    if (!user || user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Access denied');
    }
  }
}
